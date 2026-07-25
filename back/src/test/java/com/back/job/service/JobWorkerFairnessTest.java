package com.back.job.service;

import com.back.job.entity.Job;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 공정 선택(selectFair) 순수 로직 검증 — ADR-0019.
 * 스프링 컨텍스트 없이 selectFair만 직접 호출한다(다른 의존성은 사용하지 않으므로 null 주입).
 */
class JobWorkerFairnessTest {

    private final JobWorker worker = new JobWorker(null, null, null, null, null, null);

    private Job ownedBy(String owner) {
        Job job = new Job();
        job.setOwnerToken(owner);
        return job;
    }

    @Test
    void selectFair_roundRobinsAcrossOwners_soLaterOwnerIsNotStarved() {
        // A가 창을 먼저·가득 채워도(a1,a2,a3), 뒤에 온 B(b1)가 굶으면 안 된다.
        // 두 행위자로 "공정 라운드로빈"과 "순수 FIFO"를 구분한다:
        //   - 공정: limit=2 → [a1, b1]  (B가 선택됨)
        //   - FIFO(잘못): limit=2 → [a1, a2] (B는 계속 밀림)
        Job a1 = ownedBy("A");
        Job a2 = ownedBy("A");
        Job a3 = ownedBy("A");
        Job b1 = ownedBy("B");
        List<Job> candidates = List.of(a1, a2, a3, b1); // created_at 오름차순 가정

        List<Job> chosen = worker.selectFair(candidates, 2, null); // 첫 틱 — 이전 회전 상태 없음

        assertThat(chosen).hasSize(2);
        assertThat(chosen).containsExactly(a1, b1); // A의 최우선 + B(굶지 않음)
        assertThat(chosen).doesNotContain(a2);      // 같은 소유자가 연달아 독점하지 않음
    }

    @Test
    void selectFair_withinSameOwner_keepsFifoOrder() {
        // 한 소유자만 있으면 그 안에서는 오래된 순(FIFO)을 유지한다.
        Job a1 = ownedBy("A");
        Job a2 = ownedBy("A");
        Job a3 = ownedBy("A");

        List<Job> chosen = worker.selectFair(List.of(a1, a2, a3), 2, null);

        assertThat(chosen).containsExactly(a1, a2);
    }

    @Test
    void selectFair_limitLargerThanCandidates_returnsAll() {
        Job a1 = ownedBy("A");
        Job b1 = ownedBy("B");

        List<Job> chosen = worker.selectFair(List.of(a1, b1), 10, null);

        assertThat(chosen).containsExactlyInAnyOrder(a1, b1);
    }

    /**
     * 회전 상태가 없는 "첫 틱"의 의도된 동작을 문서화한다 (127 수정 후에도 유지됨).
     * 소유자가 permit 수(=limit)보다 많으면(A,B가 먼저 채우고 C가 뒤늦게 옴), 이전 틱에서 서비스한
     * 소유자 기록(lastServedOwner)이 없는 첫 픽에서는 여전히 맵 등록 순서(A,B) 그대로 골라지고 C는
     * 이번 픽에서 배제된다 — 이것 자체는 버그가 아니다. 127의 수정은 "다음 틱은 마지막으로 서비스한
     * 소유자 다음부터 회전 시작"이므로, 여러 틱에 걸쳐 C가 굶지 않는지는 아래
     * {@link #selectFair_acrossMultipleTicks_rotatesStartingOwnerSoThirdOwnerIsServedSoon()}가 검증한다.
     * 2-owner 케이스(위 테스트)만으로는 이 경계를 발견하지 못한다 — "permit 수 ≥ owner 수"일 때만 우연히
     * 통과하기 때문(패턴 B: 시나리오가 좁아 "좁게 맞는 것"과 "넓게 잘못된 것"을 구분 못함).
     */
    @Test
    void selectFair_ownerCountExceedsPermits_firstTickWithNoRotationStateStillPicksMapOrder() {
        Job a1 = ownedBy("A");
        Job a2 = ownedBy("A");
        Job b1 = ownedBy("B");
        Job b2 = ownedBy("B");
        Job c1 = ownedBy("C"); // 가장 늦게 도착(created_at 오름차순 리스트의 맨 뒤)
        List<Job> candidates = List.of(a1, a2, b1, b2, c1);

        List<Job> chosen = worker.selectFair(candidates, 2, null); // HEAVY 레인 permit=2, 회전 상태 없음

        assertThat(chosen).hasSize(2);
        assertThat(chosen).containsExactly(a1, b1); // A·B만 한 건씩, C는 이번 픽에서 완전히 배제
        assertThat(chosen).doesNotContain(c1);       // 첫 틱 한정 동작 — 다음 틱부터는 회전이 개입한다
    }

    /**
     * 127의 핵심 수정 대상: owner 수(3) > permit 수(2)일 때도 "여러 틱에 걸쳐" C가 굶지 않아야 한다.
     * 매 틱 실제 dispatchLane이 하는 일(마지막으로 고른 소유자를 기억해 다음 틱은 그 다음 소유자부터
     * 회전)을 테스트 안에서 그대로 시뮬레이션한다: 백로그에서 chosen을 제거하고, lastOwner를
     * chosen의 마지막 소유자로 갱신해 다음 틱에 넘긴다.
     * 수정 전(rotate 없음)에는 매 틱 A→B만 반복 선택되어 C가 영원히 배제된다 — 이 테스트는 그 회귀를 잡는다.
     */
    @Test
    void selectFair_acrossMultipleTicks_rotatesStartingOwnerSoThirdOwnerIsServedSoon() {
        List<Job> backlog = new ArrayList<>(List.of(
                ownedBy("A"), ownedBy("A"), ownedBy("A"),
                ownedBy("B"), ownedBy("B"), ownedBy("B"),
                ownedBy("C"), ownedBy("C"), ownedBy("C")));
        int limit = 2; // HEAVY 레인 permit=2

        List<List<Job>> ticks = new ArrayList<>();
        String lastOwner = null;
        while (!backlog.isEmpty()) {
            List<Job> chosen = worker.selectFair(backlog, limit, lastOwner);
            assertThat(chosen).isNotEmpty(); // 진행 정체(무한루프) 방지 가드
            backlog.removeAll(chosen);
            lastOwner = chosen.get(chosen.size() - 1).getOwnerToken();
            ticks.add(chosen);
        }

        // 틱1(회전 상태 없음): 기존 동작 그대로 owner 등록 순서대로 A,B 한 건씩 선택
        assertThat(ticks.get(0)).extracting(Job::getOwnerToken).containsExactly("A", "B");
        // 틱2부터 회전 개입 — C가 두 번째 틱 안에는 반드시 등장해야 한다 (수정 전엔 영원히 등장 못함)
        assertThat(ticks.get(1)).extracting(Job::getOwnerToken).contains("C");

        // 전체 9건이 모두 처리되고, 어느 소유자도 무한정 배제되지 않는다
        long ticksContainingC = ticks.stream().filter(t -> t.stream().anyMatch(j -> "C".equals(j.getOwnerToken()))).count();
        assertThat(ticksContainingC).isGreaterThanOrEqualTo(2); // C의 작업 3건이 여러 틱에 걸쳐 골고루 서비스됨
    }

    /**
     * permit=1(VIDEO 레인)에서도 회전이 owner 순서를 정확히 A→B→C→A→B→C로 순환시키는지 단정적으로 검증한다.
     * "언젠가 C가 나온다"처럼 느슨하게 assert하면 회전이 도중에 처음으로 리셋돼도 통과해버리므로,
     * 매 틱 정확히 어느 owner가 선택됐는지를 순서대로 assert한다.
     */
    @Test
    void selectFair_permitOne_rotatesExactlyRoundRobinAcrossTicks() {
        List<Job> backlog = new ArrayList<>(List.of(
                ownedBy("A"), ownedBy("A"),
                ownedBy("B"), ownedBy("B"),
                ownedBy("C"), ownedBy("C")));
        int limit = 1; // VIDEO 레인 permit=1

        List<String> servedOwnerSequence = new ArrayList<>();
        String lastOwner = null;
        while (!backlog.isEmpty()) {
            List<Job> chosen = worker.selectFair(backlog, limit, lastOwner);
            assertThat(chosen).hasSize(1);
            backlog.removeAll(chosen);
            lastOwner = chosen.get(0).getOwnerToken();
            servedOwnerSequence.add(lastOwner);
        }

        assertThat(servedOwnerSequence).containsExactly("A", "B", "C", "A", "B", "C");
    }

    /**
     * 익명 Job(ownerToken=null)도 회전에서 정상적인 "한 owner 그룹"으로 취급되어야 한다.
     * selectFair는 내부적으로 null을 ""로 묶어 owner 키로 쓰는데(byOwner.computeIfAbsent), 만약
     * dispatchLane이 회전 상태를 갱신할 때 이 정규화 없이 raw ownerToken(null)을 그대로 저장하면,
     * "익명 그룹이 마지막으로 선택됨"과 "회전 상태 없음(첫 틱)"이 똑같이 null이라 구분이 안 되고, 다음
     * 틱마다 맨 앞(익명 그룹)으로 리셋돼 버려 뒤쪽 owner가 굶는 127과 같은 패턴이 익명 그룹 한정으로
     * 재발한다. 이 테스트는 (production 코드와 동일하게) null→"" 정규화를 거쳐 lastOwner를 다음 틱에
     * 넘기고, 익명 그룹과 "A"가 A→null→A→null이 아니라 null→A→null→A로 번갈아 서비스되는지 확인한다.
     */
    @Test
    void selectFair_anonymousOwnerGroup_rotatesJustLikeAnyOtherOwner() {
        List<Job> backlog = new ArrayList<>(List.of(
                ownedBy(null), ownedBy(null),
                ownedBy("A"), ownedBy("A")));
        int limit = 1;

        List<String> servedOwnerSequence = new ArrayList<>();
        String lastOwner = null;
        while (!backlog.isEmpty()) {
            List<Job> chosen = worker.selectFair(backlog, limit, lastOwner);
            assertThat(chosen).hasSize(1);
            backlog.removeAll(chosen);
            String rawOwner = chosen.get(0).getOwnerToken();
            lastOwner = rawOwner == null ? "" : rawOwner; // dispatchLane과 동일한 정규화
            servedOwnerSequence.add(rawOwner);
        }

        assertThat(servedOwnerSequence).containsExactly(null, "A", null, "A");
    }
}
