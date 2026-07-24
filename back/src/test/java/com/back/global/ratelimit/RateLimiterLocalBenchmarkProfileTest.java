package com.back.global.ratelimit;

import com.back.AbstractMySQLIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThatCode;

/**
 * local-benchmark 프로파일(이슈 103)이 rate limiter(040, ADR-0021)를 실제로 완화하는지 검증한다.
 * 기본값(60초당 200건)은 {@link RateLimiterTest}가 순수 로직으로 이미 문서화했다 — 여기서는
 * "local-benchmark를 켜면 그 기본값이 YAML로 실제로 오버라이드된다"는 배선(wiring)만 확인한다.
 * prod 프로파일은 이 파일을 전혀 참조하지 않으므로(별도 파일, on-profile 가드) 영향이 없다 —
 * 그 사실은 application-prod.yaml에 diff가 없다는 것으로 코드 리뷰 시점에 확인한다.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles({"local", "local-benchmark"})
class RateLimiterLocalBenchmarkProfileTest extends AbstractMySQLIntegrationTest {

    @Autowired
    private RateLimiter rateLimiter;

    @Test
    void localBenchmarkProfile_allowsFarMoreThanDefault200PerWindow() {
        // 기본 한도(200)를 넘는 250건을 같은 키로 연속 호출해도 막히지 않아야 한다 —
        // local-benchmark의 max-per-window(100000)가 실제로 적용됐다는 증거.
        assertThatCode(() -> {
            for (int i = 0; i < 250; i++) {
                rateLimiter.assertNotLimited("bench-client");
            }
        }).doesNotThrowAnyException();
    }
}
