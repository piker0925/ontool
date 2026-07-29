-- V12: 멀티플레이 방 대결 승리 기록 (193)
-- 로그인 유저가 반응속도 대결 방에서 1등을 하면 한 줄 남긴다. 조회 API(승리 랭킹 UI)는 이번
-- 파일럿 스코프 밖이라 저장만 하고 인덱스는 game_id/user_id 조합 하나만 둔다(나중에 랭킹 집계 쿼리가
-- 실제로 필요해지면 그때 접근 패턴에 맞는 인덱스를 추가한다 — game_score의 V9 인덱스 감사와 같은 원칙).

create table room_win (
    id       bigint      not null auto_increment,
    game_id  varchar(50) not null,
    user_id  bigint      not null,
    won_at   datetime(6) not null,
    primary key (id),
    index idx_room_win_game_id_user_id (game_id, user_id)
) engine=InnoDB;
