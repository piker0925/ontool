package com.back.game.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Duration;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class RoomCleanupSchedulerTest {

    @Mock
    RoomRegistry roomRegistry;

    @Test
    void cleanup_설정된_유휴_타임아웃으로_레지스트리_정리를_호출한다() {
        RoomCleanupScheduler scheduler = new RoomCleanupScheduler(roomRegistry, 300);

        Instant before = Instant.now();
        scheduler.cleanup();
        Instant after = Instant.now();

        ArgumentCaptor<Instant> nowCaptor = ArgumentCaptor.forClass(Instant.class);
        ArgumentCaptor<Duration> timeoutCaptor = ArgumentCaptor.forClass(Duration.class);
        verify(roomRegistry).removeIdleRooms(nowCaptor.capture(), timeoutCaptor.capture());

        assertThat(nowCaptor.getValue()).isAfterOrEqualTo(before).isBeforeOrEqualTo(after);
        assertThat(timeoutCaptor.getValue()).isEqualTo(Duration.ofSeconds(300));
    }
}
