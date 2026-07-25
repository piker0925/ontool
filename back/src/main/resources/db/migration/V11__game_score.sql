-- V11: 게임 리더보드 (053)
-- 8개 게임 공용 점수 기록 테이블. V1 baseline과 동일한 방식으로, Hibernate 7.4.1 + MySQLDialect가
-- GameScore 엔티티로부터 생성하는 컬럼 타입(bigint/varchar/int/datetime(6))을 그대로 옮긴다.
-- game_id/user_id는 comment.user_id와 동일한 패턴으로 FK 없이 순수 컬럼 참조(모듈 간 결합을 낮춘다).
--
-- 인덱스 두 개를 테이블 생성과 함께 넣는다(V9 인덱스 감사와 달리 접근 패턴을 미리 알고 있으므로
-- 나중에 별도 마이그레이션으로 추가하지 않는다):
--   idx_game_score_game_id_score: 리더보드 상위 N 조회(게임별 점수 정렬)의 핵심 경로.
--   idx_game_score_game_id_user_id: "내 최고기록" 조회(게임+유저로 좁힘).

create table game_score (
    id          bigint      not null auto_increment,
    game_id     varchar(50) not null,
    user_id     bigint      not null,
    score       integer     not null,
    duration_ms integer     not null,
    created_at  datetime(6) not null,
    primary key (id),
    index idx_game_score_game_id_score (game_id, score),
    index idx_game_score_game_id_user_id (game_id, user_id)
) engine=InnoDB;
