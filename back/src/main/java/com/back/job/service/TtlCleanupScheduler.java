package com.back.job.service;

import com.back.global.storage.FileStorage;
import com.back.global.storage.OrphanFileSweeper;
import com.back.job.entity.Job;
import com.back.job.entity.JobStatus;
import com.back.job.repository.JobRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.Path;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 디스크 조기청소(106/ADR-0033): 한도를 레인별로 올리면서(VIDEO 1GB) 청소를 시간 기반(TTL)에만
 * 맡기면 트래픽이 있을 때 TTL 창 안에 디스크 예산(036)이 스스로 소진돼 오히려 507이 잦아질 수
 * 있다. 그래서 사용량이 상한선을 넘으면 완료된 작업을 오래된 순으로 강제 만료시켜, 바로 아래
 * 1)단계(만료 Job 정리)에서 같은 틱에 회수되게 한다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class TtlCleanupScheduler {

    private final JobRepository jobRepository;
    private final FileStorage fileStorage;
    private final OrphanFileSweeper fileSweeper;
    private final AdmissionControl admissionControl;

    @Value("${storage.upload-dir:uploads}")
    private String uploadDir;

    @Value("${storage.result-ttl}")
    private Duration resultTtl;

    // 기본 8GB(80%) — 디스크 예산(10GB, 036)에서 청소 주기(60초) 동안의 최악 동시 유입(VIDEO 배치
    // 2GB 몇 건)을 흡수할 버퍼 2GB를 뺀 값. 근거: ADR-0033.
    @Value("${storage.high-water-mark-bytes:8589934592}")
    private long highWaterMarkBytes;

    // 한 번에 몇 건씩 조기 만료시킬지 — 래칫 방식(한 틱에 다 정리 안 되면 다음 틱에 재확인해 더 처리).
    @Value("${storage.eviction-batch-size:20}")
    private int evictionBatchSize;

    @Scheduled(fixedDelayString = "${scheduling.ttl.delay:60000}")
    @Transactional
    public void cleanup() {
        // 0) 사용량이 상한선을 넘으면 완료 작업 중 가장 오래된 것부터 강제 만료 — 아래 1)단계가 같은
        //    틱에 회수한다.
        long usage = admissionControl.currentUsageBytes();
        if (usage >= highWaterMarkBytes) {
            List<Job> oldest = jobRepository.findByStatusInOrderByCreatedAtAsc(
                    List.of(JobStatus.DONE, JobStatus.FAILED), PageRequest.of(0, evictionBatchSize));
            oldest.forEach(Job::expireNow);
            jobRepository.saveAll(oldest);
            if (!oldest.isEmpty()) {
                log.warn("디스크 사용량({} bytes)이 상한선({} bytes)을 넘어 완료 작업 {}건을 조기 만료 처리했습니다.",
                        usage, highWaterMarkBytes, oldest.size());
            }
        }

        // 1) 만료된 Job의 결과·입력 파일은 회원·익명 무관 전부 삭제.
        //    row는 익명 Job만 삭제 — 회원 Job은 작업 이력(050)으로 영구 보존한다.
        var expired = jobRepository.findAllByExpiresAtBefore(LocalDateTime.now());
        expired.forEach(job -> {
            if (job.getResultKey() != null) {
                fileStorage.delete(job.getResultKey());
            }
            job.inputTempDirs().forEach(fileSweeper::deleteRecursively);
        });
        jobRepository.deleteAll(expired.stream().filter(job -> job.getUserId() == null).toList());

        // 2) 안전망: Job row에 묶이지 않은 고아 파일을 mtime 기준으로 청소
        //    (업로드 후 Job 생성 실패, 로컬 create-drop 등으로 참조를 잃은 파일)
        fileSweeper.sweep(Path.of(uploadDir), resultTtl);
    }
}
