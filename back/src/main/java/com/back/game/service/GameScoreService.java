package com.back.game.service;

import com.back.game.dto.GameLeaderboardEntry;
import com.back.game.dto.GameLeaderboardResponse;
import com.back.game.dto.GameScoreResponse;
import com.back.game.dto.GameSessionResponse;
import com.back.game.entity.GameCatalog;
import com.back.game.entity.GameDefinition;
import com.back.game.entity.GameScore;
import com.back.game.repository.GameScoreRepository;
import com.back.global.exception.AppException;
import com.back.global.exception.ErrorCode;
import com.back.user.entity.User;
import com.back.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GameScoreService {

    // 174: 클라이언트가 보내는 limit을 그대로 신뢰하지 않는다 — 과도한 값으로 조회 범위가
    // 무한정 커지는 것을 서버가 막는다. DashboardDateRange.clampDays와 동일한 방어 패턴.
    private static final int LEADERBOARD_MAX_LIMIT = 100;

    private final GameScoreRepository gameScoreRepository;
    private final UserRepository userRepository;
    private final GameSessionTokenService sessionTokenService;
    private final GameScoreRateLimiter rateLimiter;

    @Transactional(readOnly = true)
    public GameSessionResponse startSession(String gameId) {
        requireGame(gameId);
        return new GameSessionResponse(sessionTokenService.issue(gameId));
    }

    @Transactional
    public GameScoreResponse submitScore(String gameId, Long userId, int score, String sessionToken) {
        GameDefinition definition = requireGame(gameId);
        rateLimiter.assertNotLimited(userId + ":" + gameId);

        Instant issuedAt = sessionTokenService.verify(sessionToken, gameId)
                .orElseThrow(() -> new AppException(ErrorCode.GAME_SESSION_INVALID));
        long durationMs = Duration.between(issuedAt, Instant.now()).toMillis();
        if (durationMs < definition.minDurationMs()) {
            throw new AppException(ErrorCode.GAME_SESSION_INVALID);
        }
        assertPlausible(definition, score, durationMs);

        GameScore saved = gameScoreRepository.save(new GameScore(gameId, userId, score, (int) durationMs));
        return GameScoreResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public GameLeaderboardResponse getLeaderboard(String gameId, Long viewerUserId, int limit) {
        GameDefinition definition = requireGame(gameId);
        boolean desc = definition.higherIsBetter();
        int cappedLimit = Math.min(limit, LEADERBOARD_MAX_LIMIT);

        List<GameScore> rows = desc
                ? gameScoreRepository.findByGameIdOrderByScoreDesc(gameId, PageRequest.of(0, cappedLimit))
                : gameScoreRepository.findByGameIdOrderByScoreAsc(gameId, PageRequest.of(0, cappedLimit));

        Map<Long, String> nicknames = nicknamesOf(rows);
        List<GameLeaderboardEntry> topScores = rows.stream()
                .map(r -> new GameLeaderboardEntry(r.getUserId(), nicknames.get(r.getUserId()),
                        r.getScore(), r.getDurationMs(), r.getCreatedAt()))
                .toList();

        if (viewerUserId == null) {
            return new GameLeaderboardResponse(topScores, null, null);
        }
        return new GameLeaderboardResponse(topScores, myBest(gameId, viewerUserId, desc), myRank(gameId, viewerUserId, desc));
    }

    private void assertPlausible(GameDefinition definition, int score, long durationMs) {
        if (definition.minScore() != null && score < definition.minScore()) {
            throw new AppException(ErrorCode.GAME_SCORE_IMPLAUSIBLE);
        }
        if (definition.maxScorePerMs() != null && score > definition.maxScorePerMs() * durationMs) {
            throw new AppException(ErrorCode.GAME_SCORE_IMPLAUSIBLE);
        }
    }

    private Integer myBest(String gameId, Long userId, boolean desc) {
        return (desc
                ? gameScoreRepository.findMyBestDesc(gameId, userId)
                : gameScoreRepository.findMyBestAsc(gameId, userId))
                .orElse(null);
    }

    private Long myRank(String gameId, Long userId, boolean desc) {
        Integer best = myBest(gameId, userId, desc);
        if (best == null) return null;
        long better = desc
                ? gameScoreRepository.countBetterDesc(gameId, best)
                : gameScoreRepository.countBetterAsc(gameId, best);
        return better + 1;
    }

    private Map<Long, String> nicknamesOf(List<GameScore> rows) {
        List<Long> userIds = rows.stream().map(GameScore::getUserId).distinct().toList();
        return userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, User::getNickname));
    }

    private GameDefinition requireGame(String gameId) {
        return GameCatalog.find(gameId).orElseThrow(() -> new AppException(ErrorCode.GAME_NOT_FOUND));
    }
}
