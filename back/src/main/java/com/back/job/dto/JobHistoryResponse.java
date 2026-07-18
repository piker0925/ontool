package com.back.job.dto;

import java.time.LocalDateTime;

public record JobHistoryResponse(
        String id,
        String moduleId,
        String status,
        LocalDateTime createdAt,
        boolean expired,
        String downloadUrl
) {
}
