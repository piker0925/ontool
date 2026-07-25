package com.back.job.service;

import com.back.global.storage.FileStorage;
import com.back.global.storage.OrphanFileSweeper;
import com.back.job.entity.Job;
import com.back.job.entity.JobStatus;
import com.back.job.repository.JobRepository;
import com.back.tool.model.Lane;
import com.back.tool.model.ProgressReporter;
import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolModule;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class JobWorker {

    private final JobRepository jobRepository;
    private final List<ToolModule> moduleList;
    private final FileStorage fileStorage;
    private final ThreadPoolTaskExecutor taskExecutor;
    private final OrphanFileSweeper fileSweeper;
    private final LaneLimiter laneLimiter;

    private Map<String, ToolModule> modules;

    // 레인별 "마지막으로 서비스한 소유자" — 다음 틱은 이 소유자의 다음부터 순회를 시작해 owner 수가
    // permit 수를 넘어도 여러 틱에 걸쳐 골고루 서비스되게 한다(이슈 127, ADR-0019 "공정성 보장의 경계").
    // poll()이 @Scheduled(fixedDelay)로 직렬 실행되고(직전 실행 종료 후에야 다음 실행) 워커 스레드는
    // 이 필드를 건드리지 않으므로 poll 스레드 단독 접근이라 plain EnumMap으로 충분 — 동시 접근 보호 불필요.
    private final Map<Lane, String> lastServedOwner = new EnumMap<>(Lane.class);

    @PostConstruct
    void init() {
        modules = moduleList.stream()
                .collect(Collectors.toMap(ToolModule::getId, m -> m));
    }

    @Scheduled(fixedDelayString = "${scheduling.worker.delay:3000}")
    @Transactional
    public void poll() {
        for (Lane lane : Lane.values()) {
            dispatchLane(lane);
        }
    }

    private void dispatchLane(Lane lane) {
        int available = laneLimiter.available(lane);
        if (available <= 0) {
            return; // 이 레인은 지금 여유 없음 — PENDING으로 두고 다음 틱에
        }
        List<Job> candidates = jobRepository.findPendingBatchByLane(lane.name());
        if (candidates.isEmpty()) {
            return;
        }
        List<Job> chosen = selectFair(candidates, available, lastServedOwner.get(lane));
        if (!chosen.isEmpty()) {
            // 다음 틱의 회전 시작점 갱신 — 이번에 마지막으로 고른 소유자의 "다음"부터 다음 틱이 시작된다.
            // ownerToken=null(익명 그룹)은 selectFair 내부에서 ""로 정규화해 owner 키로 쓰므로, 여기서도
            // 같은 정규화를 거쳐야 한다 — 안 그러면 마지막으로 고른 job이 익명 그룹 소속일 때 저장되는
            // 값이 raw null이 되어 "회전 상태 없음"(null)과 구분 안 되고, 다음 틱이 매번 맨 앞(익명 그룹)
            // 부터 리셋돼 그 뒤 owner가 굶는 127과 같은 패턴이 재발한다.
            lastServedOwner.put(lane, normalizeOwner(chosen.get(chosen.size() - 1).getOwnerToken()));
        }
        for (Job job : chosen) {
            if (!laneLimiter.tryAcquire(lane)) {
                break; // 방어적: 여기까지 오면 permit 계산과 어긋난 것 — 남은 건 다음 틱에
            }
            String jobId = job.getId();
            // 부분 업데이트로 status만 바꾼다(037) — 워커 스레드가 poll()의 커밋 전에 같은 행을
            // findById로 먼저 읽어갈 수 있어, 전체 엔티티 save()면 서로의 갱신을 덮어쓸 위험이 있다.
            jobRepository.updateStatus(jobId, JobStatus.RUNNING);
            try {
                taskExecutor.execute(() -> processJob(jobId, lane));
            } catch (RejectedExecutionException e) {
                // permit 설계상 발생하지 않아야 하지만, 발생하면 permit·상태를 되돌려 다음 틱 재시도
                laneLimiter.release(lane);
                jobRepository.updateStatus(jobId, JobStatus.PENDING);
                log.warn("Job {} 실행 제출 거부 — PENDING 복원", jobId);
            }
        }
    }

    /**
     * 후보(created_at 오름차순)를 소유자별로 묶어 라운드로빈으로 limit개 고른다 — ADR-0019, 127.
     * 한 소유자가 창을 가득 채워도 다른 소유자가 뒤에서 굶지 않게 번갈아 선택한다.
     * 그룹 내부는 오래된 순이라 같은 소유자 안에서는 FIFO가 유지된다.
     *
     * <p>{@code startAfterOwner}(직전 틱에서 마지막으로 서비스한 소유자)가 이번 후보의 owner 목록에
     * 있으면 그 다음 소유자부터 순회를 시작한다(회전). owner 수가 limit(가용 permit)보다 많으면 한 틱
     * 안에서 모든 owner를 다 고를 수 없는데, 매번 같은 순서(맵 등록 순 = created_at 오름차순 최오래
     * owner 우선)로 시작하면 뒤쪽 owner가 앞쪽 owner들의 백로그가 빌 때까지 영원히 굶는다(127에서
     * 발견·수정). null이거나 이번 후보에 없는 owner면(직전 owner의 백로그가 이미 다 빠진 경우 등)
     * 맨 앞부터 시작한다.
     */
    List<Job> selectFair(List<Job> candidates, int limit, String startAfterOwner) {
        LinkedHashMap<String, Deque<Job>> byOwner = new LinkedHashMap<>();
        for (Job job : candidates) {
            byOwner.computeIfAbsent(normalizeOwner(job.getOwnerToken()), _ -> new ArrayDeque<>()).add(job);
        }
        List<String> owners = new ArrayList<>(byOwner.keySet());
        int ownerCount = owners.size();
        int startIndex = 0;
        if (startAfterOwner != null) {
            int lastIndex = owners.indexOf(startAfterOwner);
            if (lastIndex >= 0) {
                startIndex = (lastIndex + 1) % ownerCount;
            }
        }
        List<Job> chosen = new ArrayList<>(limit);
        while (chosen.size() < limit) {
            boolean progressed = false;
            for (int i = 0; i < ownerCount; i++) {
                if (chosen.size() >= limit) {
                    break;
                }
                Deque<Job> queue = byOwner.get(owners.get((startIndex + i) % ownerCount));
                Job job = queue.poll();
                if (job != null) {
                    chosen.add(job);
                    progressed = true;
                }
            }
            if (!progressed) {
                break; // 후보 소진
            }
        }
        return chosen;
    }

    /**
     * owner 키 정규화 — ownerToken=null(익명 그룹)을 ""로 통일한다.
     * {@link #selectFair}의 {@code byOwner} 그룹핑과 {@link #dispatchLane}의 회전 상태 저장이
     * 서로 다른 정규화를 쓰면(예: 한쪽만 null→"" 변환) 익명 그룹이 마지막으로 서비스된 다음 틱에
     * "회전 상태 없음"(null)과 구분이 안 돼 맨 앞으로 리셋되고, 그 뒤 owner가 굶는 127과 같은
     * 패턴이 익명 그룹 한정으로 재발한다 — 두 곳에서 항상 이 메서드 하나만 쓴다.
     */
    private static String normalizeOwner(String ownerToken) {
        return ownerToken == null ? "" : ownerToken;
    }

    /** 진행률→DB 저장 간 최소 간격(ms) — FFmpeg가 짧은 주기로 tick을 보고해도 DB를 매번 때리지 않게 스로틀링(037). */
    private static final long PROGRESS_SAVE_MIN_INTERVAL_MS = 1000;

    void processJob(String jobId, Lane lane) {
        Job job = jobRepository.findById(jobId).orElseThrow();
        // startedAt은 poll이 아닌 여기(실행 스레드)서 찍는다 — poll이 잡은 행 잠금이 커밋될 때까지
        // 실행 스레드는 커밋 전 스냅샷을 읽으므로, poll에서 startedAt을 써도 이 save로 덮여 유실된다.
        job.setStartedAt(LocalDateTime.now());
        try {
            ToolModule module = Optional.ofNullable(modules.get(job.getModuleId()))
                    .orElseThrow(() -> new ToolProcessingException("Module not found: " + job.getModuleId()));

            List<Path> paths = Optional.ofNullable(job.getInputPaths()).orElse(List.of())
                    .stream().map(Path::of).toList();
            Map<String, String> params = Optional.ofNullable(job.getParams()).orElse(Map.of());

            ToolResult result = module.process(new ToolInput(paths, params, progressReporterFor(jobId)));

            if (result.isFile()) {
                String key = jobId + "/result." + ext(result.outputFile());
                fileStorage.save(key, result.outputFile());
                job.setResultKey(key);
                // 파일 결과에 advisory 텍스트(예: 업스케일 경고)가 동반될 수 있다.
                job.setResultText(result.textResult());
            } else {
                job.setResultText(result.textResult());
            }
            job.setStatus(JobStatus.DONE);
            job.setProgress(100);
        } catch (Exception e) {
            log.error("Job {} 처리 실패: {}", jobId, e.getMessage(), e);
            job.setStatus(JobStatus.FAILED);
        } finally {
            laneLimiter.release(lane); // 레인 permit 반납 — 다음 폴링이 이 슬롯을 즉시 재사용
            jobRepository.save(job);
            deleteInputs(job);
        }
    }

    // 입력 임시파일은 처리 순간까지만 필요하다. 완료(DONE/FAILED) 후 즉시 삭제해 결과 TTL까지 방치되지 않게 한다.
    private void deleteInputs(Job job) {
        job.inputTempDirs().forEach(fileSweeper::deleteRecursively);
    }

    /**
     * 모듈이 report()를 부를 때마다 job.progress를 부분 업데이트로 갱신하는 리포터. 같은 값 반복 보고나
     * 너무 잦은 tick은 스로틀링해 DB에 부담을 주지 않는다(037 — ADR-0019 진행률 배관을 실제로 채움).
     * 전체 엔티티 save()가 아니라 updateProgress()를 쓰는 이유는 dispatchLane 참조.
     */
    private ProgressReporter progressReporterFor(String jobId) {
        AtomicInteger lastReported = new AtomicInteger(-1);
        AtomicLong lastSavedAtMs = new AtomicLong(0);
        return progress -> {
            int clamped = Math.max(0, Math.min(99, progress)); // 100은 완료 시 이 메서드 밖에서 확정
            if (clamped == lastReported.get()) {
                return;
            }
            long now = System.currentTimeMillis();
            if (now - lastSavedAtMs.get() < PROGRESS_SAVE_MIN_INTERVAL_MS) {
                return;
            }
            lastReported.set(clamped);
            lastSavedAtMs.set(now);
            jobRepository.updateProgress(jobId, clamped);
        };
    }

    private String ext(Path file) {
        String name = file.getFileName().toString();
        int dot = name.lastIndexOf('.');
        return dot >= 0 ? name.substring(dot + 1) : "bin";
    }
}
