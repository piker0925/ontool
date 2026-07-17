package com.back.global.security.jwt;

import com.back.global.security.TokenHasher;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZoneId;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AccessTokenRevocationService {

    private final RevokedAccessTokenRepository revokedAccessTokenRepository;
    private final JwtProvider jwtProvider;

    @Transactional
    public void revoke(String rawAccessToken) {
        Instant expiresAt = jwtProvider.parseExpiration(rawAccessToken).orElseGet(Instant::now);
        revokedAccessTokenRepository.save(new RevokedAccessToken(
                TokenHasher.sha256(rawAccessToken),
                LocalDateTime.ofInstant(expiresAt, ZoneId.systemDefault())));
    }

    @Transactional(readOnly = true)
    public boolean isRevoked(String rawAccessToken) {
        return revokedAccessTokenRepository.existsById(TokenHasher.sha256(rawAccessToken));
    }
}
