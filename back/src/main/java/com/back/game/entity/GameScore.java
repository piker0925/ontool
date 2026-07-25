package com.back.game.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

// 8개 게임 공용 랭킹 기록(053). game_id는 프론트 shellComponents.ts / mock.ts 카탈로그의 모듈 id와
// 동일한 문자열("game-2048" 등)을 그대로 쓴다 — 별도 게임 ID 체계를 만들지 않는다.
// duration_ms는 클라이언트가 보낸 값이 아니라 서버가 세션 토큰 발급 시각~제출 시각으로 직접 계산한
// 값이다(GameScoreService) — 조작 방어의 핵심이라 신뢰 가능한 서버 측 값만 저장한다.
@Entity
@Table(name = "game_score")
@Getter
@NoArgsConstructor
public class GameScore {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "game_id", nullable = false, length = 50)
    private String gameId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false)
    private int score;

    @Column(name = "duration_ms", nullable = false)
    private int durationMs;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public GameScore(String gameId, Long userId, int score, int durationMs) {
        this.gameId = gameId;
        this.userId = userId;
        this.score = score;
        this.durationMs = durationMs;
    }

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
