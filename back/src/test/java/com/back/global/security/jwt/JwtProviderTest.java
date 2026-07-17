package com.back.global.security.jwt;

import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class JwtProviderTest {

    private static final String SECRET = "test-secret-key-must-be-at-least-256-bits-long-for-hmac-sha256!!";

    private final JwtProvider jwtProvider = new JwtProvider(SECRET, 1800);

    @Test
    void issueAccessToken_발급한_토큰에서_같은_userId를_꺼낼_수_있다() {
        String token = jwtProvider.issueAccessToken(42L);

        assertThat(jwtProvider.parseUserId(token)).contains(42L);
    }

    @Test
    void parseUserId_다른_userId면_다른_값이_나온다() {
        String tokenForA = jwtProvider.issueAccessToken(1L);
        String tokenForB = jwtProvider.issueAccessToken(2L);

        assertThat(jwtProvider.parseUserId(tokenForA)).contains(1L);
        assertThat(jwtProvider.parseUserId(tokenForB)).contains(2L);
    }

    @Test
    void parseUserId_형식이_이상한_토큰은_빈값을_반환한다() {
        assertThat(jwtProvider.parseUserId("not-a-jwt")).isEmpty();
    }

    @Test
    void parseUserId_다른_시크릿으로_서명된_토큰은_빈값을_반환한다() {
        JwtProvider otherProvider = new JwtProvider("other-secret-key-also-at-least-256-bits-long-for-hmac!!", 1800);
        String token = otherProvider.issueAccessToken(1L);

        assertThat(jwtProvider.parseUserId(token)).isEmpty();
    }

    @Test
    void parseUserId_만료된_토큰은_빈값을_반환한다() throws InterruptedException {
        JwtProvider shortLivedProvider = new JwtProvider(SECRET, 0);
        String token = shortLivedProvider.issueAccessToken(1L);
        Thread.sleep(50);

        assertThat(shortLivedProvider.parseUserId(token)).isEmpty();
    }

    @Test
    void parseExpiration_발급시_설정한_만료시각을_반환한다() {
        // JWT의 exp 클레임은 초 단위(NumericDate)라 발급 순간의 밀리초는 잘려나간다 — 1초 오차를 허용한다.
        Instant before = Instant.now();
        String token = jwtProvider.issueAccessToken(1L);
        Instant after = Instant.now();

        assertThat(jwtProvider.parseExpiration(token))
                .isPresent()
                .get()
                .satisfies(exp -> assertThat(exp)
                        .isAfterOrEqualTo(before.plusSeconds(1799))
                        .isBeforeOrEqualTo(after.plusSeconds(1800)));
    }

    @Test
    void parseExpiration_형식이_이상한_토큰은_빈값을_반환한다() {
        assertThat(jwtProvider.parseExpiration("not-a-jwt")).isEmpty();
    }
}
