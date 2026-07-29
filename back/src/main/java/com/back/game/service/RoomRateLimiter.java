package com.back.game.service;

import com.back.global.exception.AppException;
import com.back.global.exception.ErrorCode;
import com.back.global.ratelimit.FixedWindowCounter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Clock;

/**
 * 방 생성 남용 방지(193). 로그인 없이도 방을 만들 수 있어 유저×게임 키(GameScoreRateLimiter)를
 * 쓸 수 없으므로 IP 기준으로 센다 — 판정 메커니즘은 FixedWindowCounter를 그대로 재사용한다.
 */
@Component
public class RoomRateLimiter {

    private final int limit;
    private final FixedWindowCounter counter;

    @Autowired
    public RoomRateLimiter(
            @Value("${ratelimit.room-create.max-per-window:10}") int limit,
            @Value("${ratelimit.room-create.window-seconds:60}") long windowSeconds) {
        this(limit, windowSeconds, Clock.systemUTC());
    }

    RoomRateLimiter(int limit, long windowSeconds, Clock clock) {
        this.limit = limit;
        this.counter = new FixedWindowCounter(windowSeconds, clock);
    }

    public void assertNotLimited(String clientKey) {
        if (counter.increment(clientKey) > limit) {
            throw new AppException(ErrorCode.RATE_LIMITED);
        }
    }
}
