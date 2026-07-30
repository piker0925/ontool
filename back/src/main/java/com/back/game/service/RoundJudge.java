package com.back.game.service;

import com.back.game.entity.ClickEvent;
import com.back.game.entity.RankedParticipant;

import java.util.Comparator;
import java.util.List;

/**
 * 193 파일럿 — 라운드 판정 순수 로직(Spring 비의존). 클라이언트가 신고한 경과시간은 신뢰하지 않고,
 * 서버가 기록한 클릭 도착 시각(arrivedAt)과 GO 브로드캐스트 시각(goAt)만으로 순위를 매긴다.
 * GO 이전 도착(부정 출발)은 정상 클릭보다 항상 뒤로 밀리고, 동시 도착은 참가자 입장 순서로
 * 결정론적으로 타이브레이크한다(공동 순위를 두지 않음).
 */
public final class RoundJudge {

    private RoundJudge() {
    }

    public static List<RankedParticipant> rank(java.time.Instant goAt, List<ClickEvent> clicks, List<String> joinOrder) {
        Comparator<ClickEvent> comparator = Comparator
                .<ClickEvent>comparingInt(c -> c.arrivedAt().isBefore(goAt) ? 1 : 0) // 부정 출발은 뒤로
                .thenComparing(ClickEvent::arrivedAt)
                .thenComparingInt(c -> joinOrder.indexOf(c.participantId())); // 동시 도착 타이브레이크

        List<ClickEvent> sorted = clicks.stream().sorted(comparator).toList();

        return java.util.stream.IntStream.range(0, sorted.size())
                .mapToObj(i -> {
                    ClickEvent c = sorted.get(i);
                    boolean falseStart = c.arrivedAt().isBefore(goAt);
                    Long elapsedMs = falseStart ? null : java.time.Duration.between(goAt, c.arrivedAt()).toMillis();
                    return new RankedParticipant(c.participantId(), i + 1, falseStart, elapsedMs);
                })
                .toList();
    }
}
