package com.back.game.dto;

import java.util.List;

public record GameLeaderboardResponse(List<GameLeaderboardEntry> topScores, Integer myBest, Long myRank) {
}
