package com.back.game.dto;

import java.time.LocalDateTime;

public record GameLeaderboardEntry(Long userId, String nickname, int score, int durationMs, LocalDateTime createdAt) {
}
