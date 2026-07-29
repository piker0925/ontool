package com.back.game.service;

import com.back.game.entity.ClickEvent;
import com.back.game.entity.RankedParticipant;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class RoundJudgeTest {

    private static final Instant GO_AT = Instant.parse("2026-07-28T12:00:00.000Z");

    @Test
    void 정상_클릭_2명은_도착_순서대로_순위가_매겨진다() {
        List<ClickEvent> clicks = List.of(
                new ClickEvent("p2", GO_AT.plusMillis(300)),
                new ClickEvent("p1", GO_AT.plusMillis(150))
        );

        List<RankedParticipant> ranked = RoundJudge.rank(GO_AT, clicks, List.of("p1", "p2"));

        assertThat(ranked).extracting(RankedParticipant::participantId).containsExactly("p1", "p2");
        assertThat(ranked).extracting(RankedParticipant::rank).containsExactly(1, 2);
        assertThat(ranked).extracting(RankedParticipant::falseStart).containsExactly(false, false);
    }

    @Test
    void 부정_출발은_실제로는_더_빨리_도착했어도_정상_클릭보다_항상_뒤로_밀린다() {
        List<ClickEvent> clicks = List.of(
                // p1은 GO 이전(부정 출발)에 도착 — 시간상으로는 p2보다 빠르다.
                new ClickEvent("p1", GO_AT.minusMillis(50)),
                new ClickEvent("p2", GO_AT.plusMillis(500))
        );

        List<RankedParticipant> ranked = RoundJudge.rank(GO_AT, clicks, List.of("p1", "p2"));

        assertThat(ranked).extracting(RankedParticipant::participantId).containsExactly("p2", "p1");
        assertThat(ranked).extracting(RankedParticipant::falseStart).containsExactly(false, true);
    }

    @Test
    void 동시_도착이면_참가자_입장_순서로_타이브레이크한다() {
        Instant sameInstant = GO_AT.plusMillis(200);
        List<ClickEvent> clicks = List.of(
                new ClickEvent("p2", sameInstant),
                new ClickEvent("p1", sameInstant)
        );

        // 입장 순서는 p1이 먼저(방장) — 동시 도착이면 먼저 입장한 쪽이 앞선다.
        List<RankedParticipant> ranked = RoundJudge.rank(GO_AT, clicks, List.of("p1", "p2"));

        assertThat(ranked).extracting(RankedParticipant::participantId).containsExactly("p1", "p2");
    }
}
