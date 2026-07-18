-- V3: 로그인 사용자 개인화 동기화 (049, ADR-0024)
-- V1/V2와 동일하게, Hibernate 7.4.1 + MySQLDialect가 UserFavorite·UserRecentTool·UserLike 엔티티로부터
-- 생성하는 DDL을 로컬 MySQL 8에 대해 캡처해서 그대로 옮긴 것이다.

create table user_favorite (
    id         bigint       not null auto_increment,
    user_id    bigint       not null,
    module_id  varchar(50)  not null,
    created_at datetime(6)  not null,
    primary key (id),
    unique key UKmjcd3gxjtphwhej3s2omgclqk (user_id, module_id)
) engine=InnoDB;

create table user_recent_tool (
    id           bigint       not null auto_increment,
    user_id      bigint       not null,
    module_id    varchar(50)  not null,
    last_used_at datetime(6)  not null,
    primary key (id),
    unique key UK7sxppl5cw7xtbam5mgc7gvsya (user_id, module_id)
) engine=InnoDB;

create table user_like (
    id         bigint       not null auto_increment,
    user_id    bigint       not null,
    module_id  varchar(50)  not null,
    created_at datetime(6)  not null,
    primary key (id),
    unique key UKa5emwhevfnsov4n8bioqaukoh (user_id, module_id)
) engine=InnoDB;
