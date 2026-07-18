package com.back.global.security.admin;

import com.google.common.cache.Cache;
import com.google.common.cache.CacheBuilder;
import com.google.common.base.Ticker;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.util.concurrent.TimeUnit;

/**
 * 관리자 Basic Auth 브루트포스 방어 — IP별 실패 횟수를 고정 윈도우로 세어 한도 초과 시 잠근다.
 * RateLimiter(040)와 카운팅 방식은 비슷하지만 의미가 다르다: RateLimiter는 "매 호출을 카운트하며
 * 동시에 판정"하지만, 여기서는 "실패만 기록"(recordFailure)과 "요청마다 확인하되 기록하지 않음"
 * (isLockedOut)이 분리돼 있어야 한다 — 정상적으로 반복되는 요청(성공한 로그인, 관리자 화면 폴링)이
 * 잠금 카운트를 소모하면 안 되기 때문이다.
 */
@Component
public class AdminLoginAttemptTracker {

    private final int maxFailures;
    private final long windowMillis;
    private final Clock clock;
    private final Cache<String, WindowCounter> failuresByIp;

    @Autowired
    public AdminLoginAttemptTracker(
            @Value("${admin.login.max-failures:5}") int maxFailures,
            @Value("${admin.login.lockout-window-seconds:300}") long windowSeconds) {
        this(maxFailures, windowSeconds, Clock.systemUTC());
    }

    AdminLoginAttemptTracker(int maxFailures, long windowSeconds, Clock clock) {
        this.maxFailures = maxFailures;
        this.windowMillis = windowSeconds * 1000;
        this.clock = clock;
        this.failuresByIp = CacheBuilder.newBuilder()
                .ticker(tickerFrom(clock))
                .expireAfterAccess(windowSeconds * 2, TimeUnit.SECONDS)
                .build();
    }

    /** 실패한 로그인 시도를 기록한다(AuthenticationFailureBadCredentialsEvent에서 호출). */
    public void recordFailure(String ip) {
        failuresByIp.asMap().compute(ip, (_, existing) -> nextWindow(existing, clock.millis(), windowMillis));
    }

    /** 기록 없이 현재 잠금 상태만 확인한다(요청 진입 시 필터에서 호출). */
    public boolean isLockedOut(String ip) {
        WindowCounter counter = failuresByIp.getIfPresent(ip);
        return counter != null
                && clock.millis() - counter.windowStartMillis() < windowMillis
                && counter.count() >= maxFailures;
    }

    static WindowCounter nextWindow(WindowCounter existing, long nowMillis, long windowMillis) {
        if (existing == null || nowMillis - existing.windowStartMillis() >= windowMillis) {
            return new WindowCounter(nowMillis, 1);
        }
        return new WindowCounter(existing.windowStartMillis(), existing.count() + 1);
    }

    private static Ticker tickerFrom(Clock clock) {
        return new Ticker() {
            @Override
            public long read() {
                return clock.millis() * 1_000_000L;
            }
        };
    }

    record WindowCounter(long windowStartMillis, int count) {}
}
