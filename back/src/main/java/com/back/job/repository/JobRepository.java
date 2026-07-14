package com.back.job.repository;

import com.back.job.entity.Job;
import com.back.job.entity.JobStatus;
import com.back.tool.model.Lane;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface JobRepository extends JpaRepository<Job, String> {

    @Query(value = "SELECT * FROM job WHERE status = 'PENDING' ORDER BY created_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED",
            nativeQuery = true)
    Optional<Job> findFirstPendingWithLock();

    /**
     * 특정 레인의 PENDING 후보를 오래된 순으로 잠그며 가져온다 (ADR-0019).
     * 워커는 이 창(고정 100건)에서 소유자별 라운드로빈으로 가용 permit만큼만 골라 RUNNING으로 올린다.
     * 고르지 않은 나머지는 PENDING으로 남고 poll 트랜잭션 종료 시 잠금이 풀린다.
     * LIMIT은 상수로 둔다 — 네이티브 쿼리를 파싱하는 JSqlParser가 LIMIT 바인드 파라미터를 거부한다.
     */
    @Query(value = "SELECT * FROM job WHERE status = 'PENDING' AND lane = :lane " +
            "ORDER BY created_at ASC LIMIT 100 FOR UPDATE SKIP LOCKED",
            nativeQuery = true)
    List<Job> findPendingBatchByLane(@Param("lane") String lane);

    /** 소유자별 in-flight(PENDING+RUNNING) 개수 — 쿼터 판정용. */
    int countByOwnerTokenAndStatusIn(String ownerToken, Collection<JobStatus> statuses);

    /** 같은 레인에서 이 시각보다 먼저 생성된 PENDING 개수 — 큐 순번(대략치) 계산용. */
    int countByLaneAndStatusAndCreatedAtBefore(Lane lane, JobStatus status, LocalDateTime createdAt);

    /** 레인별 상태 개수 — 큐 깊이 게이트(036) 판정용. */
    int countByLaneAndStatus(Lane lane, JobStatus status);

    List<Job> findAllByExpiresAtBefore(LocalDateTime now);

    List<Job> findAllByBatchId(String batchId);

    @Query(value = "SELECT COUNT(*) as total, " +
            "COALESCE(SUM(status = 'DONE'), 0) as done_count, " +
            "COALESCE(SUM(status = 'FAILED'), 0) as fail_count " +
            "FROM job WHERE batch_id = :batchId",
            nativeQuery = true)
    BatchStats getBatchStats(@Param("batchId") String batchId);
}
