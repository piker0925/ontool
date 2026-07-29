package com.back.game.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;

/**
 * 게임 조작 방어 1층: 게임 시작 시 서버가 서명한 세션 토큰을 발급하고, 점수 제출 시 검증한다(053).
 * 토큰에는 gameId + 발급시각만 담는다 — 제출 시 "발급시각~지금"을 서버 시계로 직접 재서 durationMs를
 * 계산하므로, 클라이언트가 durationMs 자체를 보낼 필요도 조작할 수도 없다.
 *
 * 발급시각은 표준 iat 클레임이 아니라 별도 커스텀 클레임(밀리초 epoch)에 담는다 — JWT 표준 iat/exp는
 * NumericDate(초 단위)라 밀리초가 버려진다. 우리 최소 플레이 시간 문턱값(300~900ms)은 그 버려지는
 * 오차(최대 999ms)보다 작아서, iat를 그대로 썼다면 발급 직후 0ms 대기로도 문턱을 통과해버린다
 * (실제로 처음 구현에서 이 버그로 테스트가 거짓 통과했다 — 반드시 커스텀 밀리초 클레임을 써야 한다).
 * 표준 exp(초 단위)는 세션 최대 유효기간(30분) 판정용으로는 초 단위 오차가 무해하므로 그대로 둔다.
 *
 * JwtProvider(로그인 액세스 토큰)와 같은 jwt.secret을 재사용한다 — 신뢰 경계가 이미 "서버가 서명한
 * 토큰"으로 동일하고, 별도 비밀키를 새로 관리할 이유가 없다. 만료(30분)는 JJWT가 파싱 시점에 자동으로
 * 검증해준다(ExpiredJwtException은 JwtException의 하위 타입).
 *
 * 알려진 한계: 토큰 자체의 재사용(같은 토큰으로 여러 번 제출)은 막지 않는다 — 그 빈도는
 * GameScoreRateLimiter가 담당한다(레이어 분리).
 */
@Component
public class GameSessionTokenService {

    private static final long SESSION_MAX_AGE_SECONDS = 30 * 60;
    private static final String CLAIM_GAME_ID = "gameId";
    private static final String CLAIM_ISSUED_AT_MS = "iatMs";
    private static final String CLAIM_ROOM_ID = "roomId";
    private static final String CLAIM_PARTICIPANT_ID = "participantId";

    private final SecretKey key;

    public GameSessionTokenService(@Value("${jwt.secret}") String secret) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public String issue(String gameId) {
        Instant now = Instant.now();
        return Jwts.builder()
                .claim(CLAIM_GAME_ID, gameId)
                .claim(CLAIM_ISSUED_AT_MS, now.toEpochMilli())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(SESSION_MAX_AGE_SECONDS)))
                .signWith(key)
                .compact();
    }

    // 193: 방 참가자 인가용 확장 — gameId만이 아니라 roomId+participantId까지 서명에 담아,
    // "이 토큰이 진짜 이 방의 이 참가자 것"임을 검증할 수 있게 한다. 로그인 여부와 무관하게 작동한다.
    public String issueForRoom(String gameId, String roomId, String participantId) {
        Instant now = Instant.now();
        return Jwts.builder()
                .claim(CLAIM_GAME_ID, gameId)
                .claim(CLAIM_ROOM_ID, roomId)
                .claim(CLAIM_PARTICIPANT_ID, participantId)
                .claim(CLAIM_ISSUED_AT_MS, now.toEpochMilli())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(SESSION_MAX_AGE_SECONDS)))
                .signWith(key)
                .compact();
    }

    /** 서명·만료·gameId+roomId+participantId 일치를 모두 검증한다. 통과하면 true. */
    public boolean verifyForRoom(String token, String gameId, String roomId, String participantId) {
        try {
            Claims claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
            return gameId.equals(claims.get(CLAIM_GAME_ID, String.class))
                    && roomId.equals(claims.get(CLAIM_ROOM_ID, String.class))
                    && participantId.equals(claims.get(CLAIM_PARTICIPANT_ID, String.class));
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    /** 서명·만료·gameId 일치를 모두 검증한 뒤, 통과하면 밀리초 정밀도의 발급 시각을 반환한다. */
    public Optional<Instant> verify(String token, String gameId) {
        try {
            Claims claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
            if (!gameId.equals(claims.get(CLAIM_GAME_ID, String.class))) {
                return Optional.empty();
            }
            Long issuedAtMs = claims.get(CLAIM_ISSUED_AT_MS, Long.class);
            if (issuedAtMs == null) {
                return Optional.empty();
            }
            return Optional.of(Instant.ofEpochMilli(issuedAtMs));
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}
