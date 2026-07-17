package com.back.user.service;

import com.back.AbstractMySQLIntegrationTest;
import com.back.user.dto.TokenPair;
import com.back.user.repository.RefreshTokenRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

// 두 탭이 "회전 전" 같은 refresh token으로 동시에 재발급을 시도하는 시나리오(ADR-0024가 30초 유예로
// 다루려는 바로 그 케이스)를 재현한다. 락이 없으면 두 트랜잭션이 각자 낡은 스냅샷을 보고 successor를
// 하나씩 만들어 계보가 두 갈래로 갈라진다 — findByTokenHash의 PESSIMISTIC_WRITE 락이 이를 막는다.
@SpringBootTest
class RefreshTokenServiceConcurrencyTest extends AbstractMySQLIntegrationTest {

    @Autowired
    RefreshTokenService refreshTokenService;
    @Autowired
    RefreshTokenRepository refreshTokenRepository;
    @Autowired
    PlatformTransactionManager txManager;

    private static final Long USER_ID = 54321L;

    @BeforeEach
    void cleanup() {
        refreshTokenRepository.deleteAll();
    }

    @Test
    void 같은_미회전_토큰으로_동시에_재발급하면_successor가_하나만_생긴다() throws InterruptedException {
        String rawToken = refreshTokenService.issue(USER_ID).refreshToken();

        CountDownLatch acquired = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        AtomicReference<Optional<TokenPair>> thread1Result = new AtomicReference<>();
        AtomicReference<Optional<TokenPair>> thread2Result = new AtomicReference<>();

        Thread thread1 = new Thread(() -> new TransactionTemplate(txManager).execute(status -> {
            thread1Result.set(refreshTokenService.rotate(rawToken));
            acquired.countDown();
            try {
                release.await();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            return null;
        }));
        thread1.start();
        acquired.await();

        Thread thread2 = new Thread(() -> thread2Result.set(refreshTokenService.rotate(rawToken)));
        thread2.start();
        Thread.sleep(300); // thread2가 락 대기 상태로 들어갈 시간을 준다

        release.countDown();
        thread1.join();
        thread2.join(5_000);

        // 락이 없다면 thread2도 "아직 회전 전"으로 보고 별개의 successor를 만들어 두 결과가 달라진다.
        assertThat(thread2Result.get().orElseThrow().refreshToken())
                .as("동시 재발급도 같은 successor를 돌려받아야 한다(멀티탭 유예 보장)")
                .isEqualTo(thread1Result.get().orElseThrow().refreshToken());

        long totalRowsForUser = refreshTokenRepository.findAll().stream()
                .filter(r -> r.getUserId().equals(USER_ID))
                .count();
        assertThat(totalRowsForUser)
                .as("원본(회전됨) + successor 1개, 총 2개여야 한다 — 계보가 두 갈래로 갈라지면 안 된다")
                .isEqualTo(2);
    }
}
