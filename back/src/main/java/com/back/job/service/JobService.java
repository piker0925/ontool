package com.back.job.service;

import com.back.global.exception.AppException;
import com.back.global.exception.ErrorCode;
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
import java.time.LocalDateTime;
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
        return jobRepository.findAllByBatchId(batchId);
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
}
