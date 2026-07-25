package com.back.game.dto;

import com.back.game.entity.GameScore;

import java.time.LocalDateTime;

public record GameScoreResponse(Long id, String gameId, int score, int durationMs, LocalDateTime createdAt) {
    public static GameScoreResponse from(GameScore entity) {
        return new GameScoreResponse(entity.getId(), entity.getGameId(), entity.getScore(),
                entity.getDurationMs(), entity.getCreatedAt());
    }
}
