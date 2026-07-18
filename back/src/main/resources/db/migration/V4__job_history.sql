-- V4: 로그인 사용자 작업 이력 (050, ADR-0024)
-- job.user_id 컬럼 추가. 익명 Job은 NULL로 남는다(X-Client-Id 기반 ownerToken과 병행 유지).

alter table job add column user_id bigint default null;
