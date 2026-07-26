package com.back.game.dto;

import com.back.game.entity.GameScore;

import java.time.LocalDateTime;

public record GameScoreResponse(Long id, String gameId, int score, int durationMs, LocalDateTime createdAt, long rank) {
    // rank: 이번에 제출한 점수 그 자체의 순위(1부터 시작) — myRank(GameLeaderboardResponse)와
    // 다르다. myRank는 "내 역대 최고 기록" 기준이라, 방금 이번 판 점수가 최고 기록보다 낮으면
    // 사용자가 "방금 몇 등 했는지"를 알 수 없었다(174 이후 리더보드 UX 피드백).
    public static GameScoreResponse from(GameScore entity, long rank) {
        return new GameScoreResponse(entity.getId(), entity.getGameId(), entity.getScore(),
                entity.getDurationMs(), entity.getCreatedAt(), rank);
    }
}
