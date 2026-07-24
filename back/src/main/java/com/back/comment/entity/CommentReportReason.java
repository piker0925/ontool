package com.back.comment.entity;

/**
 * 댓글 신고 사유(099). 음란물 카테고리는 제외(이 사이트 특성상 발생 가능성 낮음).
 * 혐오 발언·폭력적 위협·불법 정보·저작권 침해는 별도 분류하지 않고 OTHER로 흡수한다(규모상 세분화 실익 적음).
 */
public enum CommentReportReason {
    SPAM,
    ABUSE,
    PRIVACY,
    OTHER
}
