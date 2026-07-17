package com.back.global.security.jwt;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

// 로그아웃된 access 토큰을 자연 만료 전까지 무효화하기 위한 블랙리스트(ADR-0024 AC: 로그아웃한 토큰으로 401).
@Entity
@Table(name = "revoked_access_token")
@Getter
@NoArgsConstructor
public class RevokedAccessToken {

    @Id
    @Column(name = "token_hash", length = 64)
    private String tokenHash;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public RevokedAccessToken(String tokenHash, LocalDateTime expiresAt) {
        this.tokenHash = tokenHash;
        this.expiresAt = expiresAt;
    }

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
