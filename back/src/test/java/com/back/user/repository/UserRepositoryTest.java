package com.back.user.repository;

import com.back.AbstractMySQLIntegrationTest;
import com.back.user.entity.AuthProvider;
import com.back.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
class UserRepositoryTest extends AbstractMySQLIntegrationTest {

    @Autowired
    UserRepository userRepository;

    @BeforeEach
    void cleanup() {
        userRepository.deleteAll();
    }

    @Test
    void save_persistsAndFindsByProviderAndProviderId() {
        User user = new User(AuthProvider.GOOGLE, "google-1", "a@example.com", "닉네임");
        userRepository.save(user);

        Optional<User> found = userRepository.findByProviderAndProviderId(AuthProvider.GOOGLE, "google-1");

        assertThat(found).isPresent();
        assertThat(found.get().getNickname()).isEqualTo("닉네임");
        assertThat(found.get().getEmail()).isEqualTo("a@example.com");
        assertThat(found.get().getCreatedAt()).isNotNull();
    }

    @Test
    void findByProviderAndProviderId_다른_provider면_찾지_못한다() {
        userRepository.save(new User(AuthProvider.GOOGLE, "same-id", null, "구글유저"));
        userRepository.save(new User(AuthProvider.KAKAO, "same-id", null, "카카오유저"));

        Optional<User> google = userRepository.findByProviderAndProviderId(AuthProvider.GOOGLE, "same-id");
        Optional<User> kakao = userRepository.findByProviderAndProviderId(AuthProvider.KAKAO, "same-id");

        assertThat(google).isPresent();
        assertThat(google.get().getNickname()).isEqualTo("구글유저");
        assertThat(kakao).isPresent();
        assertThat(kakao.get().getNickname()).isEqualTo("카카오유저");
    }

    @Test
    void save_같은_provider와_providerId_중복이면_제약위반() {
        userRepository.saveAndFlush(new User(AuthProvider.GOOGLE, "dup-id", null, "첫유저"));

        assertThatThrownBy(() ->
                userRepository.saveAndFlush(new User(AuthProvider.GOOGLE, "dup-id", null, "둘째유저"))
        ).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void email이_null이어도_저장된다() {
        User user = new User(AuthProvider.KAKAO, "kakao-no-email", null, "카카오유저");
        userRepository.save(user);

        User found = userRepository.findByProviderAndProviderId(AuthProvider.KAKAO, "kakao-no-email").orElseThrow();
        assertThat(found.getEmail()).isNull();
    }
}
