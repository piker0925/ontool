package com.back.user.repository;

import com.back.user.entity.RefreshToken;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    List<RefreshToken> findAllByUserId(Long userId);

    // rotate() 전용 락 조회. 회전은 결과를 읽고 바로 갱신하므로, 동시에 같은(아직 회전 전) 토큰으로
    // 두 요청이 들어오면 뒤 트랜잭션이 앞 트랜잭션 커밋까지 블로킹돼야 한다 — 락 없이 두 트랜잭션이
    // 각자 스냅샷을 읽으면 successor가 두 개 생겨 멀티탭 유예 보장이 깨진다. revoke()나 조회만 하는
    // 다른 곳까지 락을 강제하지 않도록 findByTokenHash와 분리한다(락은 활성 트랜잭션을 요구한다).
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from RefreshToken r where r.tokenHash = :tokenHash")
    Optional<RefreshToken> findByTokenHashForUpdate(String tokenHash);

    // RefreshTokenService.rotate()는 탈취 감지 시에도 예외를 던지지 않고 Optional.empty()를
    // 반환하도록 설계돼 있다(AuthController가 orElseThrow로 변환) — 그래서 이 삭제를 포함한 트랜잭션
    // 전체가 정상적으로 커밋된다. REQUIRES_NEW가 필요 없고, 이미 락을 쥔 current 행도 그대로 포함해
    // 지울 수 있다(같은 트랜잭션이라 자기 자신의 락과 충돌하지 않는다).
    @Transactional
    void deleteAllByUserId(Long userId);

    @Transactional
    void deleteAllByExpiresAtBefore(LocalDateTime dateTime);
}
