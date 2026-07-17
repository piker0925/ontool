package com.back.user.service;

import com.back.global.exception.AppException;
import com.back.global.exception.ErrorCode;
import com.back.global.security.TokenHasher;
import com.back.global.security.jwt.JwtProvider;
import com.back.user.dto.TokenPair;
import com.back.user.entity.RefreshToken;
import com.back.user.repository.RefreshTokenRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Base64;

@Service
public class RefreshTokenService {

    private static final Duration DEFAULT_REFRESH_TOKEN_TTL = Duration.ofDays(14);
    // 회전 직후 동시 탭이 구 토큰으로 재요청해도 로그아웃되지 않도록 두는 유예(ADR-0024).
    private static final Duration GRACE_PERIOD = Duration.ofSeconds(30);
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtProvider jwtProvider;
    private final Clock clock;
    private final Duration refreshTokenTtl;

    @Autowired
    public RefreshTokenService(RefreshTokenRepository refreshTokenRepository, JwtProvider jwtProvider,
                                @Value("${jwt.refresh-token-expiration-days:14}") long refreshTokenExpirationDays) {
        this(refreshTokenRepository, jwtProvider, Clock.systemDefaultZone(), Duration.ofDays(refreshTokenExpirationDays));
    }

    RefreshTokenService(RefreshTokenRepository refreshTokenRepository, JwtProvider jwtProvider, Clock clock) {
        this(refreshTokenRepository, jwtProvider, clock, DEFAULT_REFRESH_TOKEN_TTL);
    }

    RefreshTokenService(RefreshTokenRepository refreshTokenRepository, JwtProvider jwtProvider, Clock clock, Duration refreshTokenTtl) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.jwtProvider = jwtProvider;
        this.clock = clock;
        this.refreshTokenTtl = refreshTokenTtl;
    }

    @Transactional
    public TokenPair issue(Long userId) {
        String rawToken = generateRawToken();
        RefreshToken token = new RefreshToken(userId, TokenHasher.sha256(rawToken), now().plus(refreshTokenTtl));
        refreshTokenRepository.save(token);
        return new TokenPair(jwtProvider.issueAccessToken(userId), rawToken);
    }

    @Transactional
    public TokenPair rotate(String rawRefreshToken) {
        RefreshToken current = refreshTokenRepository.findByTokenHash(TokenHasher.sha256(rawRefreshToken))
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_REFRESH_TOKEN));

        if (current.getExpiresAt().isBefore(now())) {
            throw new AppException(ErrorCode.INVALID_REFRESH_TOKEN);
        }

        if (current.getRotatedAt() == null) {
            return rotateFresh(current);
        }
        return reuseWithinGraceOrRevoke(current);
    }

    @Transactional
    public void revoke(String rawRefreshToken, Long authenticatedUserId) {
        refreshTokenRepository.findByTokenHash(TokenHasher.sha256(rawRefreshToken))
                .filter(token -> token.getUserId().equals(authenticatedUserId))
                .ifPresent(refreshTokenRepository::delete);
    }

    private TokenPair rotateFresh(RefreshToken current) {
        Long userId = current.getUserId();
        String newRawToken = generateRawToken();
        RefreshToken successor = new RefreshToken(userId, TokenHasher.sha256(newRawToken), now().plus(refreshTokenTtl));
        refreshTokenRepository.save(successor);

        current.rotate(newRawToken, now());
        refreshTokenRepository.save(current);

        return new TokenPair(jwtProvider.issueAccessToken(userId), newRawToken);
    }

    private TokenPair reuseWithinGraceOrRevoke(RefreshToken current) {
        Duration sinceRotation = Duration.between(current.getRotatedAt(), now());
        if (sinceRotation.compareTo(GRACE_PERIOD) <= 0) {
            return new TokenPair(jwtProvider.issueAccessToken(current.getUserId()), current.getGraceToken());
        }
        refreshTokenRepository.deleteAllByUserId(current.getUserId());
        throw new AppException(ErrorCode.INVALID_REFRESH_TOKEN);
    }

    private LocalDateTime now() {
        return LocalDateTime.now(clock);
    }

    private String generateRawToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
