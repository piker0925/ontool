package com.back.game.controller;

import com.back.game.dto.GameLeaderboardResponse;
import com.back.game.dto.GameScoreResponse;
import com.back.game.dto.GameScoreSubmitRequest;
import com.back.game.dto.GameSessionResponse;
import com.back.game.service.GameScoreService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@Tag(name = "게임 (Game)", description = "미니게임 세션 발급·점수 제출·리더보드 조회 API")
public class GameController {

    private final GameScoreService gameScoreService;

    @Operation(summary = "게임 세션 발급", description = "점수 제출 시 위변조 방지에 쓰이는 세션 토큰을 발급합니다. 비로그인 사용자도 호출 가능합니다.")
    @PostMapping("/session")
    public GameSessionResponse startSession(@Parameter(description = "게임 ID") @PathVariable String gameId) {
        return gameScoreService.startSession(gameId);
    }

    @Operation(summary = "게임 점수 제출", description = "발급받은 세션 토큰과 함께 점수를 제출합니다. 로그인한 회원만 가능하며 자동으로 리더보드에 등록됩니다.")
    @PostMapping("/scores")
    @ResponseStatus(HttpStatus.CREATED)
    public GameScoreResponse submitScore(@Parameter(description = "게임 ID") @PathVariable String gameId,
                                          @RequestBody @Valid GameScoreSubmitRequest request,
                                          @AuthenticationPrincipal Long userId) {
        return gameScoreService.submitScore(gameId, userId, request.score(), request.sessionToken());
    }

    @Operation(summary = "게임 리더보드 조회", description = "지정한 게임의 상위 점수 목록을 조회합니다. 비로그인 사용자도 호출 가능합니다.")
    @GetMapping("/leaderboard")
    public GameLeaderboardResponse leaderboard(@Parameter(description = "게임 ID") @PathVariable String gameId,
                                                @Parameter(description = "조회할 순위 개수") @RequestParam(defaultValue = "10") int limit,
                                                @AuthenticationPrincipal Long userId) {
        return gameScoreService.getLeaderboard(gameId, userId, limit);
    }
}
