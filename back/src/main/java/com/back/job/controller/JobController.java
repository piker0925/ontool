package com.back.job.controller;

import com.back.global.exception.AppException;
import com.back.global.storage.FileStorage;
import com.back.job.dto.JobResultResponse;
import com.back.job.dto.JobStatusResponse;
import com.back.job.entity.Job;
import com.back.job.entity.JobStatus;
import com.back.job.service.JobService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@RestController
@RequestMapping("/api/v1/jobs")
@RequiredArgsConstructor
public class JobController {

    private final JobService jobService;
    private final FileStorage fileStorage;

    @GetMapping("/{id}")
    public JobStatusResponse getStatus(@PathVariable String id) {
        Job job = jobService.get(id);
        return toStatus(job);
    }

    private JobStatusResponse toStatus(Job job) {
        return new JobStatusResponse(
                job.getId(),
                job.getStatus().name(),
                jobService.queuePosition(job),
                job.getProgress(),
                jobService.etaSeconds(job),
                job.getExpiresAt());
    }

    @GetMapping("/{id}/result")
    public JobResultResponse getResult(@PathVariable String id) {
        Job job = jobService.get(id);
        // 회원 Job은 만료 후에도 row가 보존된다(050) — resultKey는 남아있어도 파일은 TTL 청소로 이미 삭제됐으므로
        // 만료 시 URL은 내려주지 않는다. resultText는 파일이 아니라 DB 컬럼이라 만료와 무관하게 유효하다.
        if (job.getResultKey() != null && !jobService.isExpired(job)) {
            // 파일 결과 + advisory 텍스트(예: 업스케일 경고)가 함께 있을 수 있다.
            return new JobResultResponse(fileStorage.getUrl(job.getResultKey()), job.getResultText());
        }
        return new JobResultResponse(null, job.getResultText());
    }

    @GetMapping(value = "/{id}/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@PathVariable String id) {
        SseEmitter emitter = new SseEmitter(300_000L);

        ExecutorService exec = Executors.newSingleThreadExecutor();
        emitter.onCompletion(exec::shutdownNow);
        emitter.onTimeout(exec::shutdownNow);

        exec.submit(() -> {
            String lastSignature = null;
            try {
                while (!Thread.currentThread().isInterrupted()) {
                    Job job = jobService.get(id);
                    String status = job.getStatus().name();
                    int queuePosition = jobService.queuePosition(job);
                    Long etaSeconds = jobService.etaSeconds(job);
                    // 상태뿐 아니라 진행률·큐 순번이 바뀌어도 푸시한다 (ADR-0019 진행 가시화).
                    String signature = status + ":" + job.getProgress() + ":" + queuePosition;
                    if (!signature.equals(lastSignature)) {
                        lastSignature = signature;
                        Map<String, Object> payload = new HashMap<>();
                        payload.put("jobId", id);
                        payload.put("status", status);
                        payload.put("queuePosition", queuePosition);
                        payload.put("progress", job.getProgress());
                        payload.put("etaSeconds", etaSeconds); // null 가능 → HashMap 사용
                        emitter.send(SseEmitter.event()
                                .name("job-status-changed")
                                .data(payload, MediaType.APPLICATION_JSON));
                    }
                    if (job.getStatus() == JobStatus.DONE || job.getStatus() == JobStatus.FAILED) {
                        emitter.complete();
                        return;
                    }
                    Thread.sleep(2000);
                }
            } catch (AppException e) {
                // Job may have been removed by TTL cleanup
                try { emitter.complete(); } catch (IllegalStateException ignored) {}
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            } catch (IllegalStateException ignored) {
                // Emitter already completed (e.g. client disconnected or timeout)
            } catch (Exception e) {
                try { emitter.completeWithError(e); } catch (IllegalStateException ignored) {}
            }
        });

        return emitter;
    }
}
