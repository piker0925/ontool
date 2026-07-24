package com.back.job.service;

import com.back.job.entity.Job;
import org.junit.jupiter.api.Test;

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

        List<Job> chosen = worker.selectFair(candidates, 2);

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

        List<Job> chosen = worker.selectFair(List.of(a1, a2, a3), 2);

        assertThat(chosen).containsExactly(a1, a2);
    }

    @Test
    void selectFair_limitLargerThanCandidates_returnsAll() {
        Job a1 = ownedBy("A");
        Job b1 = ownedBy("B");

        List<Job> chosen = worker.selectFair(List.of(a1, b1), 10);

        assertThat(chosen).containsExactlyInAnyOrder(a1, b1);
    }

    /**
     * 특성화(characterization) 테스트 — 127에서 고치기 전까지는 "현재 동작"을 문서화한다.
     * 소유자가 permit 수(=limit)보다 많으면(A,B가 먼저 채우고 C가 뒤늦게 옴), C는 이번 픽에서 전혀
     * 선택되지 못한다 — while 루프가 owner 순회 도중 chosen.size()>=limit이 되는 즉시 break하기 때문에
     * 한 라운드에 각 owner당 최대 1건이라도, limit=owner 수 미만이면 뒤쪽 owner는 매 틱 굶는다(이슈 103
     * 그릴링에서 JobWorker.selectFair 실제 코드로 발견한 경계, 이슈 127이 라운드로빈 공정성을 수정 대상).
     * 2-owner 케이스(위 테스트)만으로는 이 경계를 발견하지 못한다 — "permit 수 ≥ owner 수"일 때만 우연히
     * 통과하기 때문(패턴 B: 시나리오가 좁아 "좁게 맞는 것"과 "넓게 잘못된 것"을 구분 못함).
     */
    @Test
    void selectFair_ownerCountExceedsPermits_laterOwnerStarvesInThisPick() {
        Job a1 = ownedBy("A");
        Job a2 = ownedBy("A");
        Job b1 = ownedBy("B");
        Job b2 = ownedBy("B");
        Job c1 = ownedBy("C"); // 가장 늦게 도착(created_at 오름차순 리스트의 맨 뒤)
        List<Job> candidates = List.of(a1, a2, b1, b2, c1);

        List<Job> chosen = worker.selectFair(candidates, 2); // HEAVY 레인 permit=2

        assertThat(chosen).hasSize(2);
        assertThat(chosen).containsExactly(a1, b1); // A·B만 한 건씩, C는 이번 픽에서 완전히 배제
        assertThat(chosen).doesNotContain(c1);       // 현재(127 이전) 동작: C는 A·B 백로그가 있는 한 계속 밀림
    }
}
