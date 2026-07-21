-- V6: 관리자 액션 감사로그 (058)
-- 관리자 계정이 단일이라 "누가"는 의미가 없어 기록하지 않고, "언제 + 무엇을(action_type, target_id)"만 남긴다.
-- 지금 실제로 기록을 남기는 곳은 강제 로그아웃(FORCE_LOGOUT)과 댓글 삭제(COMMENT_DELETE) 두 곳뿐이다.
-- MEMBER_SUSPEND/MEMBER_UNSUSPEND/ACCOUNT_FORCE_DELETE는 아직 구현되지 않은 기능이지만, 나중에
-- 그 기능들이 AdminActionLogService.record(...)만 호출하면 되도록 액션 타입에 미리 포함해 둔다.
--
-- V1 baseline과 동일한 방식: Hibernate 7.4.1 + MySQLDialect가 AdminActionLog 엔티티로부터 생성하는
-- DDL을 그대로 옮긴다. @Enumerated(EnumType.STRING) 필드는 네이티브 MySQL ENUM으로 생성되고,
-- 값은 선언 순서가 아니라 알파벳순으로 나열된다(V1의 job.status/lane과 동일한 패턴).

create table admin_action_log (
    id           bigint      not null auto_increment,
    action_type  enum ('ACCOUNT_FORCE_DELETE','COMMENT_DELETE','FORCE_LOGOUT','MEMBER_SUSPEND','MEMBER_UNSUSPEND') not null,
    target_id    bigint      not null,
    performed_at datetime(6) not null,
    primary key (id)
) engine=InnoDB;
