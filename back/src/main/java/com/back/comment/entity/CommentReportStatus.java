package com.back.comment.entity;

/**
 * 댓글 신고 처리 상태(099). 상태 전환은 댓글 삭제·유저 정지를 자동 트리거하지 않는다 —
 * 그건 관리자가 기존 021/056 액션으로 별도 수행한다. "검토 여부" 표시일 뿐이라 058 감사로그 대상이 아니다.
 */
public enum CommentReportStatus {
    PENDING,
    RESOLVED,
    DISMISSED
}
