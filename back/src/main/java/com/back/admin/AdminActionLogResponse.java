package com.back.admin;

import com.back.adminactionlog.entity.AdminActionLog;
import com.back.adminactionlog.entity.AdminActionType;

import java.time.LocalDateTime;

public record AdminActionLogResponse(Long id, AdminActionType actionType, Long targetId, LocalDateTime performedAt) {

    public static AdminActionLogResponse from(AdminActionLog log) {
        return new AdminActionLogResponse(log.getId(), log.getActionType(), log.getTargetId(), log.getPerformedAt());
    }
}
