package com.back.user.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

// 테이블명 app_user: "user"는 MySQL 예약어라 매 쿼리마다 이스케이프가 필요해져 피한다.
@Entity
@Table(name = "app_user", uniqueConstraints = @UniqueConstraint(columnNames = {"provider", "provider_id"}))
@Getter
@NoArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private AuthProvider provider;

    @Column(name = "provider_id", nullable = false, length = 100)
    private String providerId;

    @Setter
    @Column(length = 255)
    private String email;

    @Setter
    @Column(nullable = false, length = 20)
    private String nickname;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public User(AuthProvider provider, String providerId, String email, String nickname) {
        this.provider = provider;
        this.providerId = providerId;
        this.email = email;
        this.nickname = nickname;
    }

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
