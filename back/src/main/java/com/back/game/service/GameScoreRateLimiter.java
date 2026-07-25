package com.back.game.service;

import com.back.global.exception.AppException;
import com.back.global.exception.ErrorCode;
import com.back.global.ratelimit.FixedWindowCounter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Clock;

/**
 * 게임 조작 방어 2층: 유저×게임당 점수 제출 빈도 상한(053). 세션 토큰(GameSessionTokenService)이
 * "최소 플레이 시간"은 강제하지만 같은 토큰의 반복 제출 자체는 막지 않으므로, 짧은 시간에 대량으로
 * 찍어내는 시도는 이 레이어가 막는다. RateLimiter(global.ratelimit, 업로드 IP별 한도)와 판정 로직은
 * 같지만 대상(유저×게임)과 기본 한도가 달라 별도 인스턴스로 둔다 — 카운팅 메커니즘 자체는
 * FixedWindowCounter를 그대로 재사용한다.
 */
@Component
public class GameScoreRateLimiter {

    private final int limit;
    private final FixedWindowCounter counter;

    @Autowired
    public GameScoreRateLimiter(
            @Value("${ratelimit.game-score.max-per-window:20}") int limit,
            @Value("${ratelimit.game-score.window-seconds:60}") long windowSeconds) {
        this(limit, windowSeconds, Clock.systemUTC());
    }

    GameScoreRateLimiter(int limit, long windowSeconds, Clock clock) {
        this.limit = limit;
        this.counter = new FixedWindowCounter(windowSeconds, clock);
    }

    public void assertNotLimited(String clientKey) {
        if (counter.increment(clientKey) > limit) {
            throw new AppException(ErrorCode.RATE_LIMITED);
        }
    }
}
