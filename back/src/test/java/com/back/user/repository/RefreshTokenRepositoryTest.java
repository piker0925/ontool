package com.back.user.repository;

import com.back.AbstractMySQLIntegrationTest;
import com.back.user.entity.AuthProvider;
import com.back.user.entity.RefreshToken;
import com.back.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class RefreshTokenRepositoryTest extends AbstractMySQLIntegrationTest {

    @Autowired
    UserRepository userRepository;

    @Autowired
    RefreshTokenRepository refreshTokenRepository;

    @BeforeEach
    void cleanup() {
        refreshTokenRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void save_persistsAndFindsByTokenHash() {
        User user = userRepository.save(new User(AuthProvider.GOOGLE, "g1", null, "유저"));
        RefreshToken token = new RefreshToken(user.getId(), "hash-abc", LocalDateTime.now().plusDays(14));
        refreshTokenRepository.save(token);

        Optional<RefreshToken> found = refreshTokenRepository.findByTokenHash("hash-abc");

        assertThat(found).isPresent();
        assertThat(found.get().getUserId()).isEqualTo(user.getId());
        assertThat(found.get().getRotatedAt()).isNull();
        assertThat(found.get().getCreatedAt()).isNotNull();
    }

    @Test
    void rotate_회전된_토큰은_rotatedAt과_graceToken을_기록한다() {
        User user = userRepository.save(new User(AuthProvider.GOOGLE, "g2", null, "유저"));
        RefreshToken token = refreshTokenRepository.save(
                new RefreshToken(user.getId(), "hash-old", LocalDateTime.now().plusDays(14)));

        token.rotate("raw-new-token", LocalDateTime.now());
        refreshTokenRepository.save(token);

        RefreshToken reloaded = refreshTokenRepository.findByTokenHash("hash-old").orElseThrow();
        assertThat(reloaded.getRotatedAt()).isNotNull();
        assertThat(reloaded.getGraceToken()).isEqualTo("raw-new-token");
    }

    @Test
    void deleteAllByUserId_해당_유저의_토큰만_삭제한다() {
        User userA = userRepository.save(new User(AuthProvider.GOOGLE, "a", null, "A"));
        User userB = userRepository.save(new User(AuthProvider.GOOGLE, "b", null, "B"));
        refreshTokenRepository.save(new RefreshToken(userA.getId(), "hash-a", LocalDateTime.now().plusDays(14)));
        refreshTokenRepository.save(new RefreshToken(userB.getId(), "hash-b", LocalDateTime.now().plusDays(14)));

        refreshTokenRepository.deleteAllByUserId(userA.getId());

        assertThat(refreshTokenRepository.findByTokenHash("hash-a")).isEmpty();
        assertThat(refreshTokenRepository.findByTokenHash("hash-b")).isPresent();
    }
}
