package com.back.game.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;

// 193: 방은 DB가 아니라 서버 메모리에만 있어 TtlCleanupScheduler(Job)처럼 DB row를 정리하는 방식이
// 아니다 — 대신 RoomRegistry가 들고 있는 in-memory 맵에서 유휴 방을 직접 제거한다. 실행 주기는
// AuthTokenCleanupScheduler와 같은 이유로 기존 scheduling.ttl.delay를 재사용한다(새 주기 설정 남발 방지).
@Component
public class RoomCleanupScheduler {

    private final RoomRegistry roomRegistry;
    private final long idleTimeoutSeconds;

    @Autowired
    public RoomCleanupScheduler(
            RoomRegistry roomRegistry,
            // 기존 SSE 이미터 타임아웃(5분, JobController.stream/RoomBroadcaster.subscribe)과 같은 수준.
            @Value("${scheduling.room-cleanup.idle-timeout-seconds:300}") long idleTimeoutSeconds) {
        this.roomRegistry = roomRegistry;
        this.idleTimeoutSeconds = idleTimeoutSeconds;
    }

    @Scheduled(fixedDelayString = "${scheduling.ttl.delay:60000}")
    public void cleanup() {
        roomRegistry.removeIdleRooms(Instant.now(), Duration.ofSeconds(idleTimeoutSeconds));
    }
}
