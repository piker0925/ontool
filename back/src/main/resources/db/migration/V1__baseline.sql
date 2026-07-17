-- V1 baseline: 현재 운영 스키마(v1 엔티티 4개)를 고정한다.
-- ADR-0025. 이 파일 이후의 모든 스키마 변경은 버전 마이그레이션 스크립트로만 한다.
--
-- 컬럼 정의는 hand-guess가 아니라, 실제로 Hibernate 7.4.1 + MySQLDialect가 4개 엔티티로부터
-- 생성하는 DDL을 Testcontainers MySQL 8에 대해 캡처해서 그대로 옮긴 것이다
-- (jakarta.persistence.schema-generation.scripts.action=create). 특히 @Enumerated(EnumType.STRING)
-- 필드(job.lane, job.status)는 @Column(length=10) 지정과 무관하게 Hibernate가 네이티브
-- MySQL ENUM 타입으로 생성한다 — varchar(10)으로 손으로 추정했다면 drift 테스트가 잡아냈을 차이.
--
-- ⚠ 운영 DB 실측 대조 필요: 이 파일은 로컬 Testcontainers 기준 "엔티티가 기대하는 스키마"이며,
-- 실제 운영 DB의 SHOW CREATE TABLE 출력과 아직 대조하지 못했다. baseline-on-migrate=true라서
-- 기존 운영 DB에는 이 스크립트가 적용되지 않고 건너뛰지만(테이블이 이미 존재하므로), 만약 운영
-- 스키마가 여기 정의와 실제로 다르다면 그 차이는 이 파일이 아니라 운영 DB 쪽에 숨어 있게 된다.
-- 배포 전 사람이 한 번 SHOW CREATE TABLE로 대조할 것.

create table job (
    id           varchar(36)                          not null,
    module_id    varchar(50)                           not null,
    batch_id     varchar(36),
    owner_token  varchar(36),
    lane         enum ('HEAVY','VIDEO')                not null,
    status       enum ('DONE','FAILED','PENDING','RUNNING') not null,
    input_paths  json,
    params       json,
    result_key   varchar(255),
    result_text  text,
    created_at   datetime(6)                           not null,
    started_at   datetime(6),
    progress     integer                               not null,
    expires_at   datetime(6)                           not null,
    primary key (id)
) engine=InnoDB;

create table comment (
    id         bigint      not null auto_increment,
    module_id  varchar(50) not null,
    content    text,
    created_at datetime(6) not null,
    primary key (id)
) engine=InnoDB;

create table tool_stats (
    module_id  varchar(50) not null,
    use_count  bigint      not null,
    like_count bigint      not null,
    primary key (module_id)
) engine=InnoDB;

create table suggestion (
    id         bigint      not null auto_increment,
    content    text,
    created_at datetime(6) not null,
    primary key (id)
) engine=InnoDB;
