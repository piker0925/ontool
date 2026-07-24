package com.back.comment.dto;

import com.back.comment.entity.CommentReportReason;

/** 신고된 댓글 작성자(userId)와 그 신고 1건의 사유 — 서비스 레이어에서 유저별·사유별로 집계하는 원자료. */
public record ReportedUserReason(Long userId, CommentReportReason reason) {
}
