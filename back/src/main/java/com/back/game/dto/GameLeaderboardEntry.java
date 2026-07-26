package com.back.game.dto;

import java.time.LocalDateTime;

// id: 이 기록(GameScore 행) 자체의 식별자 — 프론트가 "방금 제출한 그 기록"을 목록에서 정확히
// 짚어내는 데 쓴다(userId+score만으로는 같은 유저의 동점 기록끼리 구분이 안 됨).
public record GameLeaderboardEntry(Long id, Long userId, String nickname, int score, int durationMs, LocalDateTime createdAt) {
}
