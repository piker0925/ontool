package com.back.game.controller;

import com.back.game.dto.GameLeaderboardResponse;
import com.back.game.dto.GameScoreResponse;
import com.back.game.dto.GameScoreSubmitRequest;
import com.back.game.dto.GameSessionResponse;
import com.back.game.service.GameScoreService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

// 053: 게임 리더보드. 세션 발급·리더보드 조회는 비로그인도 가능(SecurityConfig permitAll 기본값),
// 점수 제출만 인증 필수(SecurityConfig에 명시적으로 authenticated() 추가) — "로그인 사용자만 자동
// 등록" 결정(이슈 053 triaged 메모)을 서버 쪽에서 강제한다.
@RestController
@RequestMapping("/api/v1/games/{gameId}")
@RequiredArgsConstructor
public class GameController {

    private final GameScoreService gameScoreService;

    @PostMapping("/session")
    public GameSessionResponse startSession(@PathVariable String gameId) {
        return gameScoreService.startSession(gameId);
    }

    @PostMapping("/scores")
    @ResponseStatus(HttpStatus.CREATED)
    public GameScoreResponse submitScore(@PathVariable String gameId,
                                          @RequestBody @Valid GameScoreSubmitRequest request,
                                          @AuthenticationPrincipal Long userId) {
        return gameScoreService.submitScore(gameId, userId, request.score(), request.sessionToken());
    }

    @GetMapping("/leaderboard")
    public GameLeaderboardResponse leaderboard(@PathVariable String gameId,
                                                @RequestParam(defaultValue = "10") int limit,
                                                @AuthenticationPrincipal Long userId) {
        return gameScoreService.getLeaderboard(gameId, userId, limit);
    }
}
