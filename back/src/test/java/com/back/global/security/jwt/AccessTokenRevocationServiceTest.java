package com.back.global.security.jwt;

import com.back.global.security.TokenHasher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AccessTokenRevocationServiceTest {

    @Mock
    RevokedAccessTokenRepository repository;
    @Mock
    JwtProvider jwtProvider;

    private AccessTokenRevocationService service;

    @BeforeEach
    void setUp() {
        service = new AccessTokenRevocationService(repository, jwtProvider);
    }

    @Test
    void revoke_토큰의_해시를_만료시각과_함께_저장한다() {
        Instant expiresAt = Instant.parse("2026-07-18T01:30:00Z");
        when(jwtProvider.parseExpiration("raw-access-token")).thenReturn(Optional.of(expiresAt));

        service.revoke("raw-access-token");

        ArgumentCaptor<RevokedAccessToken> captor = ArgumentCaptor.forClass(RevokedAccessToken.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getTokenHash()).isEqualTo(TokenHasher.sha256("raw-access-token"));
    }

    @Test
    void isRevoked_저장된_토큰이면_true() {
        when(repository.existsById(TokenHasher.sha256("raw-access-token"))).thenReturn(true);

        assertThat(service.isRevoked("raw-access-token")).isTrue();
    }

    @Test
    void isRevoked_저장되지_않은_토큰이면_false() {
        when(repository.existsById(any())).thenReturn(false);

        assertThat(service.isRevoked("other-token")).isFalse();
    }
}
