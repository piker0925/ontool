-- V5: 회원 댓글 닉네임 표시 (051, ADR-0024)
-- comment.user_id 컬럼 추가. 익명 댓글은 NULL로 남는다.

alter table comment add column user_id bigint default null;
