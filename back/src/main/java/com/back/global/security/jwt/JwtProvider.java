package com.back.global.security.jwt;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;

@Component
public class JwtProvider {

    private final SecretKey key;
    private final long accessTokenExpirationSeconds;

    public JwtProvider(@Value("${jwt.secret}") String secret,
                        @Value("${jwt.access-token-expiration-seconds:1800}") long accessTokenExpirationSeconds) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessTokenExpirationSeconds = accessTokenExpirationSeconds;
    }

    public String issueAccessToken(Long userId) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(accessTokenExpirationSeconds)))
                .signWith(key)
                .compact();
    }

    public Optional<Long> parseUserId(String token) {
        return parseClaims(token).map(claims -> Long.valueOf(claims.getSubject()));
    }

    public Optional<Instant> parseExpiration(String token) {
        return parseClaims(token).map(claims -> claims.getExpiration().toInstant());
    }

    private Optional<Claims> parseClaims(String token) {
        try {
            return Optional.of(Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload());
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}
