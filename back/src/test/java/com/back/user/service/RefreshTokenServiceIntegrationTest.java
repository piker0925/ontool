package com.back.user.service;

import com.back.AbstractMySQLIntegrationTest;
import com.back.user.entity.RefreshToken;
import com.back.user.repository.RefreshTokenRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

// 실제 @Transactional 환경에서만 드러나는 문제(트랜잭션 롤백이 다른 삭제까지 되돌리는지)를 검증한다 —
// 순수 Mockito 유닛 테스트(RefreshTokenServiceTest)는 "메서드 호출 여부"만 보기 때문에 이 종류의
// 버그를 못 잡는다. 실제로 이 테스트가 처음 초록불이 되기 전, deleteAllByUserId가 rotate()의
// 트랜잭션과 함께 롤백돼 "전체 폐기"가 아무 일도 안 하는 버그를 잡아냈다.
@SpringBootTest
class RefreshTokenServiceIntegrationTest extends AbstractMySQLIntegrationTest {

    @Autowired
    RefreshTokenService refreshTokenService;
    @Autowired
    RefreshTokenRepository refreshTokenRepository;

    private static final Long USER_ID = 12345L;

    @BeforeEach
    void cleanup() {
        refreshTokenRepository.deleteAll();
    }

    @Test
    void 유예를_초과한_재사용은_빈값을_반환하면서도_해당_유저의_다른_토큰까지_실제로_삭제되어_남아있으면_안된다() {
        String survivorRawToken = refreshTokenService.issue(USER_ID).refreshToken();

        String rotatedRawToken = refreshTokenService.issue(USER_ID).refreshToken();
        refreshTokenService.rotate(rotatedRawToken);

        RefreshToken rotatedRow = refreshTokenRepository.findByTokenHash(sha256(rotatedRawToken)).orElseThrow();
        rotatedRow.rotate(rotatedRow.getGraceToken(), LocalDateTime.now().minusSeconds(31));
        refreshTokenRepository.save(rotatedRow);

        assertThat(refreshTokenService.rotate(rotatedRawToken)).isEmpty();

        assertThat(refreshTokenRepository.findByTokenHash(sha256(survivorRawToken)))
                .as("유예 초과 재사용은 탈취로 간주해 해당 유저의 다른 refresh token도 전부 폐기해야 한다")
                .isEmpty();
        assertThat(refreshTokenRepository.findById(rotatedRow.getId()))
                .as("반복 재생을 막기 위해 재사용된 토큰 자신도 지워야 한다")
                .isEmpty();
    }

    private static String sha256(String raw) {
        try {
            var digest = java.security.MessageDigest.getInstance("SHA-256");
            return java.util.HexFormat.of().formatHex(digest.digest(raw.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
