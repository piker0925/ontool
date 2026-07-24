package com.back.comment.dto;

import com.back.comment.entity.CommentReportStatus;
import jakarta.validation.constraints.NotNull;

public record CommentReportStatusUpdateRequest(@NotNull CommentReportStatus status) {
}
