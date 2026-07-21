package com.back.adminactionlog.entity;

/**
 * 관리자 행위 감사로그(058)의 액션 종류.
 * MEMBER_SUSPEND/MEMBER_UNSUSPEND/ACCOUNT_FORCE_DELETE는 아직 이 저장소에 구현된 기능이 아니다 —
 * 나중에 해당 기능들이 추가될 때 AdminActionLogService.record(...)를 그대로 호출할 수 있도록
 * 미리 타입만 마련해 둔 것이다.
 */
public enum AdminActionType {
    FORCE_LOGOUT,
    COMMENT_DELETE,
    MEMBER_SUSPEND,
    MEMBER_UNSUSPEND,
    ACCOUNT_FORCE_DELETE
}
