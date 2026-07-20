package com.back.job.repository;

import com.back.job.entity.Job;
import com.back.job.entity.JobStatus;
import com.back.tool.model.Lane;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

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

    /** 모듈별 상태 개수 — 관리자 통계의 실패 건수 집계용(060). */
    int countByModuleIdAndStatus(String moduleId, JobStatus status);

    List<Job> findAllByExpiresAtBefore(LocalDateTime now);

    List<Job> findAllByBatchId(String batchId);

    /** 관리자 큐 조회(060) — 상태별 현재 Job 목록. */
    List<Job> findAllByStatusIn(Collection<JobStatus> statuses);

    /** 회원 작업 이력(050) — 최신순 페이징. */
    Page<Job> findAllByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    /** 회원 탈퇴(055-②) — Job row는 지우지 않고 작성자 연결만 끊는다(익명 Job과 동일한 처지가 된다). */
    @Modifying
    @Query("UPDATE Job j SET j.userId = null WHERE j.userId = :userId")
    void anonymizeByUserId(@Param("userId") Long userId);

    /**
     * status만 갱신하는 부분 업데이트(037). dispatchLane이 잡은 job 스냅샷은 poll()의 트랜잭션이
     * 커밋되기 전에 워커 스레드가 먼저 findById로 같은 행을 읽어갈 수 있어(REPEATABLE READ 하에서
     * 서로 다른 스냅샷), 전체 엔티티 save()를 쓰면 어느 한쪽이 상대의 갱신을 덮어쓸 위험이 있다.
     */
    @Modifying
    @Transactional
    @Query("UPDATE Job j SET j.status = :status WHERE j.id = :id")
    void updateStatus(@Param("id") String id, @Param("status") JobStatus status);

    /**
     * progress만 갱신하는 부분 업데이트(037) — 같은 이유로 status 등 다른 필드를 스냅샷째 덮어쓰지 않는다.
     * 워커 스레드(processJob)는 열린 트랜잭션 없이 이 메서드를 부르므로 자체 @Transactional이 필요하다.
     */
    @Modifying
    @Transactional
    @Query("UPDATE Job j SET j.progress = :progress WHERE j.id = :id")
    void updateProgress(@Param("id") String id, @Param("progress") int progress);

    @Query(value = "SELECT COUNT(*) as total, " +
            "COALESCE(SUM(status = 'DONE'), 0) as done_count, " +
            "COALESCE(SUM(status = 'FAILED'), 0) as fail_count " +
            "FROM job WHERE batch_id = :batchId",
            nativeQuery = true)
    BatchStats getBatchStats(@Param("batchId") String batchId);
}
