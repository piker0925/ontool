package com.back.comment.dto;

import com.back.comment.entity.CommentReport;
import com.back.comment.entity.CommentReportReason;
import com.back.comment.entity.CommentReportStatus;

import java.time.LocalDateTime;

/**
 * 관리자용 개별 신고 상세(099) — 댓글 내용과 신고자 정보까지 포함한다.
 * 신고자 정보는 관리자에게만 노출되며(허위·악용 신고 확인용), 이 레코드는 /admin/** 응답에만 쓰인다.
 */
public record CommentReportResponse(
        Long id,
        Long commentId,
        String commentContent,
        CommentReportReason reason,
        String detail,
        CommentReportStatus status,
        Long reporterId,
        String reporterNickname,
        LocalDateTime createdAt
) {
    public static CommentReportResponse of(CommentReport report, String commentContent, String reporterNickname) {
        return new CommentReportResponse(
                report.getId(),
                report.getCommentId(),
                commentContent,
                report.getReason(),
                report.getDetail(),
                report.getStatus(),
                report.getReporterId(),
                reporterNickname,
                report.getCreatedAt()
        );
    }
}
