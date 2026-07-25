package com.back.adminactionlog.entity;

/**
 * 관리자 행위 감사로그(058)의 액션 종류.
 * MEMBER_SUSPEND/MEMBER_UNSUSPEND는 056에서, ACCOUNT_FORCE_DELETE는 100에서 구현됨.
 */
public enum AdminActionType {
    FORCE_LOGOUT,
    COMMENT_DELETE,
    MEMBER_SUSPEND,
    MEMBER_UNSUSPEND,
    ACCOUNT_FORCE_DELETE
}
