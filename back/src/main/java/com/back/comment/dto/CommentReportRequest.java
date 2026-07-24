package com.back.comment.dto;

import com.back.comment.entity.CommentReportReason;
import jakarta.validation.constraints.NotNull;

public record CommentReportRequest(@NotNull CommentReportReason reason, String detail) {
}
