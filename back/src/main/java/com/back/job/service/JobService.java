package com.back.job.service;

import com.back.global.exception.AppException;
import com.back.global.exception.ErrorCode;
import com.back.global.util.DashboardDateRange;
import com.back.job.dto.DailyJobCount;
import com.back.job.entity.Job;
import com.back.job.entity.JobStatus;
import com.back.job.repository.BatchStats;
import com.back.job.repository.JobRepository;
import com.back.stats.service.ToolStatsService;
import com.back.tool.model.Lane;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class JobService {

    private static final Set<JobStatus> IN_FLIGHT = Set.of(JobStatus.PENDING, JobStatus.RUNNING);

    private final JobRepository jobRepository;
    private final ToolStatsService toolStatsService;
    private final Duration resultTtl;
    private final int maxInFlight;

    public JobService(JobRepository jobRepository,
                      ToolStatsService toolStatsService,
                      @Value("${storage.result-ttl}") Duration resultTtl,
                      @Value("${identity.quota.max-in-flight:200}") int maxInFlight) {
        this.jobRepository = jobRepository;
        this.toolStatsService = toolStatsService;
        this.resultTtl = resultTtl;
        this.maxInFlight = maxInFlight;
    }

    /**
     * 소유자의 in-flight(PENDING+RUNNING) 작업이 상한을 넘지 않는지 확인한다 (ADR-0019).
     * 배치 업로드는 incoming(추가될 job 수)을 미리 합산해 한 번에 판정한다.
     * 공정 스케줄링이 이미 독점을 막지만, 디스크·남용에 대한 2차 방어선이다.
     */
    public void assertWithinQuota(String ownerToken, int incoming) {
        if (ownerToken == null) {
            return; // 식별자 없으면(비정상 경로) 쿼터 판정 생략 — 공정성 라운드로빈이 여전히 보호
        }
        int current = jobRepository.countByOwnerTokenAndStatusIn(ownerToken, IN_FLIGHT);
        if (current + incoming > maxInFlight) {
            throw new AppException(ErrorCode.QUOTA_EXCEEDED);
        }
    }

    public Job create(String moduleId, Lane lane, String ownerToken, Long userId,
                      List<String> inputPaths, Map<String, String> params) {
        return create(moduleId, lane, ownerToken, userId, null, inputPaths, params);
    }

    public Job create(String moduleId, Lane lane, String ownerToken, Long userId, String batchId,
                      List<String> inputPaths, Map<String, String> params) {
        toolStatsService.incrementUseCount(moduleId);
        Job job = new Job();
        job.setModuleId(moduleId);
        job.setLane(lane);
        job.setOwnerToken(ownerToken);
        job.setUserId(userId);
        job.setBatchId(batchId);
        job.setStatus(JobStatus.PENDING);
        job.setInputPaths(inputPaths);
        job.setParams(params);
        job.setExpiresAt(LocalDateTime.now().plus(resultTtl));
        return jobRepository.save(job);
    }

    public Job get(String id) {
        return jobRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.JOB_NOT_FOUND));
    }

    /**
     * 저장 키(jobId/result.ext)로 다운로드 표시용 파일명을 만든다(112) — 원본 입력 파일명 기반,
     * 038의 {@link ZipEntryNamer}(정화·Zip Slip 방지 포함)를 재사용한다. 키 형식이 아니거나, job을
     * 못 찾거나, 원본 입력이 없으면(경로 정화 후 빈 이름 등) fallback을 그대로 돌려준다. 저장 키의
     * jobId/원본 파일명 매핑은 이 서비스가 소유하는 지식이라 컨트롤러가 아니라 여기서 판단한다.
     */
    public String displayFilenameFor(String key, String fallback) {
        int sep = key.indexOf('/');
        if (sep < 0) {
            return fallback;
        }
        String jobId = key.substring(0, sep);
        return jobRepository.findById(jobId)
                .map(Job::firstInputPath)
                .filter(input -> !input.isEmpty())
                .map(input -> new ZipEntryNamer().nameFor(input, key))
                .orElse(fallback);
    }

    /** 같은 레인에서 이 작업 앞에 대기 중인 PENDING 수(대략치). RUNNING 이후면 0. */
    public int queuePosition(Job job) {
        if (job.getStatus() != JobStatus.PENDING) {
            return 0;
        }
        return jobRepository.countByLaneAndStatusAndCreatedAtBefore(
                job.getLane(), JobStatus.PENDING, job.getCreatedAt());
    }

    /**
     * 남은 예상 시간(초). 진행률이 있는 RUNNING 작업에서만 정직하게 계산한다
     * (경과시간 × (100-progress)/progress). 그 외(PENDING 등)는 큐 순번으로 안내하고 null 반환.
     */
    public Long etaSeconds(Job job) {
        if (job.getStatus() != JobStatus.RUNNING || job.getStartedAt() == null
                || job.getProgress() <= 0 || job.getProgress() >= 100) {
            return null;
        }
        long elapsed = Duration.between(job.getStartedAt(), LocalDateTime.now()).getSeconds();
        return elapsed * (100 - job.getProgress()) / job.getProgress();
    }

    public List<Job> getBatchJobs(String batchId) {
        return jobRepository.findAllByBatchIdOrderByCreatedAtAsc(batchId);
    }

    public BatchStats getBatchStats(String batchId) {
        return jobRepository.getBatchStats(batchId);
    }

    /** 관리자 큐 조회(060) — 지정한 상태의 Job 목록. */
    public List<Job> findByStatusIn(Set<JobStatus> statuses) {
        return jobRepository.findAllByStatusIn(statuses);
    }

    /** 회원 작업 이력(050) — 최신순 페이징. */
    public Page<Job> findByUserId(Long userId, Pageable pageable) {
        return jobRepository.findAllByUserIdOrderByCreatedAtDesc(userId, pageable);
    }

    /** 결과 보관 기간이 지났는지 — 지났으면 파일은 이미 청소됐을 수 있다(row는 회원 Job이라 보존됨, 050). */
    public boolean isExpired(Job job) {
        return LocalDateTime.now().isAfter(job.getExpiresAt());
    }

    /** 어드민 대시보드(118) — 레인별 전체 처리 분포. 그룹 집계는 리포지토리에 그대로 위임한다. */
    public List<JobRepository.LaneCount> getLaneDistribution() {
        return jobRepository.countGroupedByLane();
    }

    /**
     * 어드민 대시보드(118) — 최근 days일 일별 성공/실패 집계. 리포지토리가 돌려주는 (날짜,상태) 행을
     * 하루 단위로 합치고, 데이터가 없는 날짜도 0으로 채워 넣어 라인 차트에 구멍이 생기지 않게 한다.
     */
    public List<DailyJobCount> getDailyJobCounts(int days) {
        int clampedDays = DashboardDateRange.clampDays(days);
        LocalDate today = LocalDate.now();
        LocalDate start = today.minusDays(clampedDays - 1L);

        Map<LocalDate, long[]> byDate = new HashMap<>();
        for (JobRepository.DailyStatusCount row : jobRepository.countGroupedByDateAndStatusSince(start.atStartOfDay())) {
            long[] bucket = byDate.computeIfAbsent(row.getDate(), d -> new long[2]);
            if (row.getStatus() == JobStatus.DONE) {
                bucket[0] += row.getCount();
            } else if (row.getStatus() == JobStatus.FAILED) {
                bucket[1] += row.getCount();
            }
        }

        List<DailyJobCount> result = new ArrayList<>();
        for (LocalDate d = start; !d.isAfter(today); d = d.plusDays(1)) {
            long[] bucket = byDate.getOrDefault(d, new long[2]);
            result.add(new DailyJobCount(d, bucket[0], bucket[1]));
        }
        return result;
    }
}
