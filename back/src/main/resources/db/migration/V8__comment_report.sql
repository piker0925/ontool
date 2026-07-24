-- V8: 댓글 신고 (099)
-- 056(회원 정지)의 판정 근거로 쓰일 신고 누적치를 제공하기 위한 선행 기능.
--
-- V1 baseline과 동일한 방식: Hibernate 7.4.1 + MySQLDialect가 CommentReport 엔티티로부터
-- 생성하는 DDL을 Testcontainers MySQL 8에 대해 캡처해서 그대로 옮긴 것이다.
-- comment_id/reporter_id는 FK 연관관계 없이 순수 컬럼으로만 참조한다(comment.user_id와 동일한 패턴,
-- 모듈 간 결합을 낮춘다). (reporter_id, comment_id) 유니크 제약이 같은 유저의 동일 댓글 재신고를 막는다.

create table comment_report (
    comment_id  bigint      not null,
    created_at  datetime(6) not null,
    id          bigint      not null auto_increment,
    reporter_id bigint      not null,
    detail      text,
    reason      enum ('ABUSE','OTHER','PRIVACY','SPAM') not null,
    status      enum ('DISMISSED','PENDING','RESOLVED') not null,
    primary key (id),
    unique key UK7a7j27uutr1ew9m87et35eily (reporter_id, comment_id)
) engine=InnoDB;
