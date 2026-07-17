-- V2: 소셜 로그인 사용자 + 리프레시 토큰 (048, ADR-0024)
-- V1과 동일한 방식으로, 실제 Hibernate 7.4.1 + MySQLDialect가 User·RefreshToken 엔티티로부터
-- 생성하는 DDL을 Testcontainers MySQL 8에 대해 캡처해서 그대로 옮긴 것이다.
--
-- 테이블명 app_user: "user"는 MySQL 예약어라 엔티티에서부터 다른 이름을 쓴다 (User.java 참고).

create table app_user (
    id          bigint       not null auto_increment,
    provider    enum ('GOOGLE','KAKAO') not null,
    provider_id varchar(100) not null,
    email       varchar(255),
    nickname    varchar(20)  not null,
    created_at  datetime(6)  not null,
    primary key (id),
    unique key UKqefkh42kjv2w6k1sgjlmh6ogj (provider, provider_id)
) engine=InnoDB;

create table refresh_token (
    id          bigint       not null auto_increment,
    user_id     bigint       not null,
    token_hash  varchar(64)  not null,
    rotated_at  datetime(6),
    grace_token varchar(255),
    expires_at  datetime(6)  not null,
    created_at  datetime(6)  not null,
    primary key (id),
    unique key UKkdj16cltjxdksuyiosdhliveg (token_hash)
) engine=InnoDB;

-- 로그아웃된 access 토큰 블랙리스트 (자연 만료 전까지 무효화, RevokedAccessToken 참고)
create table revoked_access_token (
    token_hash varchar(64) not null,
    expires_at datetime(6) not null,
    created_at datetime(6) not null,
    primary key (token_hash)
) engine=InnoDB;
