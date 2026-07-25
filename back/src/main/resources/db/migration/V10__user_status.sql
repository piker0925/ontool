-- V10: 회원 정지(056) — 댓글 작성만 차단하는 상태 컬럼. 기존 유저는 전부 ACTIVE로 채워진다.
alter table app_user add column status varchar(10) not null default 'ACTIVE';
