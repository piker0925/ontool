package com.back.comment.dto;

import com.back.comment.entity.CommentReportReason;

import java.util.Map;

/** 유저별 신고 누적 집계(099) — 056(회원 정지) 판단 근거. 익명 댓글(userId null)은 애초에 이 집계에 들어오지 않는다. */
public record CommentReportUserAggregateResponse(
        Long userId,
        String nickname,
        long totalCount,
        Map<CommentReportReason, Long> reasonCounts
) {
}
