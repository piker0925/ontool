-- V9: DB 인덱스 커버리지 감사 (108)
-- 전체 Repository의 findBy*/@Query 파생 쿼리를 전수 조사한 결과, job 테이블은 PK(id) 외에
-- 보조 인덱스가 하나도 없었다 — 워커의 SKIP LOCKED 폴링(3~5초 간격)과 TTL/토큰 정리
-- 스케줄러(60초 간격, ADR-0033/AuthTokenCleanupScheduler)가 전부 풀스캔으로 돌고 있었다.
-- 근거(EXPLAIN, 시딩된 MySQL)는 back/src/test/java/com/back/migration/IndexUsageAuditTest.java 참고.
--
-- 대상 선정 기준: (a) 스케줄러/워커가 반복 호출하는 핫패스, 또는 (b) 무기한 누적되는 테이블에 대한
-- 사용자 대면 조회. 관리자 전용·저빈도·소규모 테이블 쿼리(예: job.module_id+status 실패건수 집계,
-- comment_report 검색, user.search LIKE)는 의도적으로 제외했다 — 근거는 이슈 108 감사표 참고.

-- job: 워커가 레인별로 폴링하는 핫패스(JobWorker.findPendingBatchByLane) + 같은 접두사를 쓰는
-- countByLaneAndStatus/countByLaneAndStatusAndCreatedAtBefore(036 admission control)
alter table job add index idx_job_lane_status_created_at (lane, status, created_at);

-- job: 관리자 활성 큐 조회(AdminController.getJobs 기본 필터 findAllByStatusIn(PENDING,RUNNING))가
-- 쓰는, lane 없이 status만 필터하는 경로 — 진행 중 상태는 완료 상태보다 훨씬 적은 소수라 선택적이다.
-- ⚠ TtlCleanupScheduler의 조기 만료 대상 조회(findByStatusInOrderByCreatedAtAsc, status IN
-- (DONE,FAILED))도 이 인덱스를 탈 것으로 처음 기대했으나, 시딩된 EXPLAIN으로 측정해보니 DONE+FAILED가
-- 테이블 대부분(현실적 분포 기준 약 85%)을 차지해 옵티마이저가 인덱스 레인지+PK 재조회보다 클러스터드
-- 인덱스 풀스캔을 더 싸다고(정확히) 판단해 이 인덱스를 타지 않는다 — 그 경로는 인덱스로 득을 보지
-- 못한다는 것이 측정 결과다(회귀 가드: IndexUsageAuditTest#job_조기만료_대상_조회는_행_대부분이_걸려_풀스캔이_맞다).
alter table job add index idx_job_status_created_at (status, created_at);

-- job: TtlCleanupScheduler가 60초마다 전체 스캔하는 만료 대상 조회(findAllByExpiresAtBefore)
alter table job add index idx_job_expires_at (expires_at);

-- job: 배치 업로드 진행 중 프론트가 반복 폴링하는 배치 진행률 조회(findAllByBatchId/getBatchStats)
alter table job add index idx_job_batch_id (batch_id);

-- job: 업로드마다(단건/배치 모두) 쿼터 판정에 쓰는 countByOwnerTokenAndStatusIn
alter table job add index idx_job_owner_token_status (owner_token, status);

-- job: 로그인 사용자 작업 이력(050) 페이지 조회 — 회원 Job은 영구 보존되어 무기한 누적됨
alter table job add index idx_job_user_id_created_at (user_id, created_at);

-- comment: 툴 페이지 방문마다 호출되는 모듈별 댓글 목록(findAllByModuleIdOrderByCreatedAtDesc)
alter table comment add index idx_comment_module_id_created_at (module_id, created_at);

-- refresh_token: AuthTokenCleanupScheduler가 60초마다 전체 스캔하는 만료 토큰 정리
alter table refresh_token add index idx_refresh_token_expires_at (expires_at);

-- refresh_token: 탈취 감지·강제 로그아웃(deleteAllByUserId) — 보안 임계 경로이고 테이블이
-- 로그인/회전마다 계속 누적되므로, 호출 빈도는 낮아도 스캔 비용이 계속 커진다
alter table refresh_token add index idx_refresh_token_user_id (user_id);

-- revoked_access_token: 같은 스케줄러가 60초마다 전체 스캔하는 만료 토큰 정리
alter table revoked_access_token add index idx_revoked_access_token_expires_at (expires_at);

-- admin_action_log: 감사로그는 삭제되지 않고 무기한 누적된다. 정렬만 있고 필터가 없는
-- findAll(Sort.by(performedAt desc).and(id desc)) 페이징이 테이블이 커질수록 매번 풀 filesort를
-- 하게 되므로, 오름차순 복합 인덱스를 역방향으로 스캔해 정렬을 대신하게 한다.
alter table admin_action_log add index idx_admin_action_log_performed_at_id (performed_at, id);
