package com.back.global.security.admin;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 관리자 로그인 브루트포스 방어(IP별 실패 횟수 잠금)의 순수 정책.
 * RateLimiter(040)와 카운팅 방식은 비슷하지만, "실패만 기록"과 "매 요청마다 확인(기록 없이)"이
 * 분리돼 있어야 해서(성공 요청·정상 폴링이 카운트를 소모하면 안 됨) 별도 컴포넌트로 둔다.
 */
class AdminLoginAttemptTrackerTest {

    @Test
    void 실패가_없으면_잠기지_않는다() {
        AdminLoginAttemptTracker tracker = new AdminLoginAttemptTracker(3, 60, Clock.systemUTC());

        assertThat(tracker.isLockedOut("1.2.3.4")).isFalse();
    }

    @Test
    void 실패_횟수가_한도_미만이면_잠기지_않는다() {
        MutableClock clock = new MutableClock(Instant.parse("2026-07-15T00:00:00Z"));
        AdminLoginAttemptTracker tracker = new AdminLoginAttemptTracker(3, 60, clock);

        tracker.recordFailure("1.2.3.4");
        tracker.recordFailure("1.2.3.4");

        assertThat(tracker.isLockedOut("1.2.3.4")).isFalse();
    }

    @Test
    void 실패_횟수가_한도에_도달하면_잠긴다() {
        MutableClock clock = new MutableClock(Instant.parse("2026-07-15T00:00:00Z"));
        AdminLoginAttemptTracker tracker = new AdminLoginAttemptTracker(3, 60, clock);

        tracker.recordFailure("1.2.3.4");
        tracker.recordFailure("1.2.3.4");
        tracker.recordFailure("1.2.3.4");

        assertThat(tracker.isLockedOut("1.2.3.4")).isTrue();
    }

    @Test
    void 확인만_해서는_카운트가_늘지_않는다() {
        // isLockedOut을 여러 번 불러도(성공한 정상 요청이 반복돼도) 실패 카운트가 소모되지 않아야 한다.
        MutableClock clock = new MutableClock(Instant.parse("2026-07-15T00:00:00Z"));
        AdminLoginAttemptTracker tracker = new AdminLoginAttemptTracker(3, 60, clock);

        tracker.recordFailure("1.2.3.4");
        tracker.recordFailure("1.2.3.4");
        for (int i = 0; i < 10; i++) {
            tracker.isLockedOut("1.2.3.4");
        }

        assertThat(tracker.isLockedOut("1.2.3.4")).isFalse();
    }

    @Test
    void 다른_IP는_서로_영향을_주지_않는다() {
        MutableClock clock = new MutableClock(Instant.parse("2026-07-15T00:00:00Z"));
        AdminLoginAttemptTracker tracker = new AdminLoginAttemptTracker(2, 60, clock);

        tracker.recordFailure("1.1.1.1");
        tracker.recordFailure("1.1.1.1");
        assertThat(tracker.isLockedOut("1.1.1.1")).isTrue();

        assertThat(tracker.isLockedOut("2.2.2.2")).isFalse();
    }

    @Test
    void 윈도우가_지나면_잠금이_풀린다() {
        MutableClock clock = new MutableClock(Instant.parse("2026-07-15T00:00:00Z"));
        AdminLoginAttemptTracker tracker = new AdminLoginAttemptTracker(2, 60, clock);

        tracker.recordFailure("1.2.3.4");
        tracker.recordFailure("1.2.3.4");
        assertThat(tracker.isLockedOut("1.2.3.4")).isTrue();

        clock.advance(61);

        assertThat(tracker.isLockedOut("1.2.3.4")).isFalse();
    }

    static final class MutableClock extends Clock {
        private Instant instant;

        MutableClock(Instant instant) {
            this.instant = instant;
        }

        void advance(long seconds) {
            instant = instant.plusSeconds(seconds);
        }

        @Override
        public ZoneOffset getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(java.time.ZoneId zone) {
            throw new UnsupportedOperationException();
        }

        @Override
        public Instant instant() {
            return instant;
        }
    }
}
