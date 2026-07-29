package com.back.game.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

// 193: 멀티플레이 방 대결 승리 기록. 로그인 유저가 1등일 때만 저장된다(게스트는 기록 없음).
// 조회 API(승리 랭킹 UI)는 이번 파일럿 스코프 밖 — 데이터만 남겨둔다.
@Entity
@Table(name = "room_win")
@Getter
@NoArgsConstructor
public class RoomWin {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "game_id", nullable = false, length = 50)
    private String gameId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "won_at", nullable = false, updatable = false)
    private LocalDateTime wonAt;

    public RoomWin(String gameId, Long userId) {
        this.gameId = gameId;
        this.userId = userId;
    }

    @PrePersist
    void onCreate() {
        wonAt = LocalDateTime.now();
    }
}
