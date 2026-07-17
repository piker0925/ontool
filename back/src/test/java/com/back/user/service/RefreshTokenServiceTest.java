package com.back.user.service;

import com.back.global.exception.AppException;
import com.back.global.exception.ErrorCode;
import com.back.global.security.jwt.JwtProvider;
import com.back.user.dto.TokenPair;
import com.back.user.entity.RefreshToken;
import com.back.user.repository.RefreshTokenRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.HexFormat;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RefreshTokenServiceTest {

    @Mock
    RefreshTokenRepository refreshTokenRepository;
    @Mock
    JwtProvider jwtProvider;

    private static final Clock FIXED_CLOCK = Clock.fixed(Instant.parse("2026-07-18T00:00:00Z"), ZoneOffset.UTC);
    private static final LocalDateTime NOW = LocalDateTime.now(FIXED_CLOCK);

    private RefreshTokenService refreshTokenService;

    @BeforeEach
    void setUp() {
        refreshTokenService = new RefreshTokenService(refreshTokenRepository, jwtProvider, FIXED_CLOCK);
    }

    @Test
    void issue_새로운_refreshToken을_해시로_저장하고_토큰쌍을_반환한다() {
        when(jwtProvider.issueAccessToken(1L)).thenReturn("access-token");

        TokenPair result = refreshTokenService.issue(1L);

        assertThat(result.accessToken()).isEqualTo("access-token");
        assertThat(result.refreshToken()).isNotBlank();

        ArgumentCaptor<RefreshToken> captor = ArgumentCaptor.forClass(RefreshToken.class);
        verify(refreshTokenRepository).save(captor.capture());
        RefreshToken saved = captor.getValue();
        assertThat(saved.getUserId()).isEqualTo(1L);
        assertThat(saved.getTokenHash()).isEqualTo(sha256(result.refreshToken()));
        assertThat(saved.getExpiresAt()).isEqualTo(NOW.plusDays(14));
    }

    @Test
    void rotate_존재하지_않는_토큰이면_거부한다() {
        when(refreshTokenRepository.findByTokenHash(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> refreshTokenService.rotate("garbage"))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.INVALID_REFRESH_TOKEN);
    }

    @Test
    void rotate_만료된_토큰이면_거부한다() {
        String rawToken = "expired-raw";
        RefreshToken row = new RefreshToken(1L, sha256(rawToken), NOW.minusSeconds(1));
        when(refreshTokenRepository.findByTokenHash(sha256(rawToken))).thenReturn(Optional.of(row));

        assertThatThrownBy(() -> refreshTokenService.rotate(rawToken))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.INVALID_REFRESH_TOKEN);
    }

    @Test
    void rotate_아직_회전되지_않은_토큰이면_새_토큰쌍을_발급하고_이전_토큰을_회전_기록한다() {
        String rawToken = "current-raw";
        RefreshToken row = new RefreshToken(1L, sha256(rawToken), NOW.plusDays(14));
        when(refreshTokenRepository.findByTokenHash(sha256(rawToken))).thenReturn(Optional.of(row));
        when(jwtProvider.issueAccessToken(1L)).thenReturn("new-access");

        TokenPair result = refreshTokenService.rotate(rawToken);

        assertThat(result.accessToken()).isEqualTo("new-access");
        assertThat(result.refreshToken()).isNotBlank().isNotEqualTo(rawToken);

        assertThat(row.getRotatedAt()).isEqualTo(NOW);
        assertThat(row.getGraceToken()).isEqualTo(result.refreshToken());

        ArgumentCaptor<RefreshToken> captor = ArgumentCaptor.forClass(RefreshToken.class);
        verify(refreshTokenRepository, times(2)).save(captor.capture());
        RefreshToken successor = captor.getAllValues().get(0);
        assertThat(successor.getUserId()).isEqualTo(1L);
        assertThat(successor.getTokenHash()).isEqualTo(sha256(result.refreshToken()));
    }

    @Test
    void rotate_회전_직후_30초_이내_재사용이면_동일한_후속_토큰쌍을_반환한다() {
        String oldRaw = "old-raw";
        RefreshToken row = new RefreshToken(1L, sha256(oldRaw), NOW.plusDays(14));
        row.rotate("successor-raw", NOW.minusSeconds(10));
        when(refreshTokenRepository.findByTokenHash(sha256(oldRaw))).thenReturn(Optional.of(row));
        when(jwtProvider.issueAccessToken(1L)).thenReturn("fresh-access");

        TokenPair result = refreshTokenService.rotate(oldRaw);

        assertThat(result.accessToken()).isEqualTo("fresh-access");
        assertThat(result.refreshToken()).isEqualTo("successor-raw");
        verify(refreshTokenRepository, never()).save(any());
        verify(refreshTokenRepository, never()).deleteAllByUserId(any());
    }

    @Test
    void rotate_유예를_초과한_재사용은_탈취로_간주해_해당_유저의_토큰을_전부_폐기한다() {
        String oldRaw = "old-raw";
        RefreshToken row = new RefreshToken(1L, sha256(oldRaw), NOW.plusDays(14));
        row.rotate("successor-raw", NOW.minusSeconds(31));
        when(refreshTokenRepository.findByTokenHash(sha256(oldRaw))).thenReturn(Optional.of(row));

        assertThatThrownBy(() -> refreshTokenService.rotate(oldRaw))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.INVALID_REFRESH_TOKEN);

        verify(refreshTokenRepository).deleteAllByUserId(1L);
    }

    @Test
    void revoke_본인의_토큰이면_삭제한다() {
        String rawToken = "raw";
        RefreshToken row = new RefreshToken(1L, sha256(rawToken), NOW.plusDays(14));
        when(refreshTokenRepository.findByTokenHash(sha256(rawToken))).thenReturn(Optional.of(row));

        refreshTokenService.revoke(rawToken, 1L);

        verify(refreshTokenRepository).delete(row);
    }

    @Test
    void revoke_다른_유저의_토큰이면_삭제하지_않는다() {
        String rawToken = "raw";
        RefreshToken row = new RefreshToken(1L, sha256(rawToken), NOW.plusDays(14));
        when(refreshTokenRepository.findByTokenHash(sha256(rawToken))).thenReturn(Optional.of(row));

        refreshTokenService.revoke(rawToken, 2L);

        verify(refreshTokenRepository, never()).delete(any());
    }

    @Test
    void revoke_존재하지_않는_토큰이면_예외없이_아무일도_하지_않는다() {
        when(refreshTokenRepository.findByTokenHash(sha256("does-not-exist"))).thenReturn(Optional.empty());

        refreshTokenService.revoke("does-not-exist", 1L);

        verify(refreshTokenRepository, never()).delete(any());
    }

    private static String sha256(String raw) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(raw.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
