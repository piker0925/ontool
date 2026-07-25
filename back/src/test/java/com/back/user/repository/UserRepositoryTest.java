package com.back.user.repository;

import com.back.AbstractMySQLIntegrationTest;
import com.back.user.entity.AuthProvider;
import com.back.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
class UserRepositoryTest extends AbstractMySQLIntegrationTest {

    @Autowired
    UserRepository userRepository;

    @Autowired
    JdbcTemplate jdbcTemplate;

    @BeforeEach
    void cleanup() {
        userRepository.deleteAll();
    }

    /** createdAt은 @PrePersist 전용이라 엔티티 세터로 과거 날짜를 강제할 수 없다 — 저장 후 직접 갱신한다. */
    private void forceCreatedAt(Long userId, LocalDateTime createdAt) {
        jdbcTemplate.update("UPDATE app_user SET created_at = ? WHERE id = ?", createdAt, userId);
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

    @Test
    void countGroupedByProvider_provider별로_전체_유저수를_센다() {
        userRepository.save(new User(AuthProvider.GOOGLE, "g1", null, "g1"));
        userRepository.save(new User(AuthProvider.GOOGLE, "g2", null, "g2"));
        userRepository.save(new User(AuthProvider.KAKAO, "k1", null, "k1"));

        Map<AuthProvider, Long> counts = userRepository.countGroupedByProvider().stream()
                .collect(java.util.stream.Collectors.toMap(UserRepository.ProviderCount::getProvider, UserRepository.ProviderCount::getCount));

        assertThat(counts).containsEntry(AuthProvider.GOOGLE, 2L).containsEntry(AuthProvider.KAKAO, 1L);
    }

    @Test
    void countGroupedByDateSince_날짜별로_그룹핑하고_범위_밖은_제외한다() {
        LocalDate today = LocalDate.now();
        User inRangeA1 = userRepository.save(new User(AuthProvider.GOOGLE, "d1", null, "d1"));
        User inRangeA2 = userRepository.save(new User(AuthProvider.GOOGLE, "d2", null, "d2"));
        User inRangeB = userRepository.save(new User(AuthProvider.KAKAO, "d3", null, "d3"));
        User outOfRange = userRepository.save(new User(AuthProvider.GOOGLE, "d4", null, "d4"));

        forceCreatedAt(inRangeA1.getId(), today.minusDays(1).atTime(9, 0));
        forceCreatedAt(inRangeA2.getId(), today.minusDays(1).atTime(15, 0)); // 같은 날 다른 시각 — 같은 버킷으로 합쳐져야 함
        forceCreatedAt(inRangeB.getId(), today.atTime(10, 0));
        forceCreatedAt(outOfRange.getId(), today.minusDays(10).atTime(9, 0)); // 조회 범위 밖 — 제외돼야 함

        List<UserRepository.DailySignupRow> rows = userRepository.countGroupedByDateSince(today.minusDays(3).atStartOfDay());

        Map<LocalDate, Long> byDate = rows.stream()
                .collect(java.util.stream.Collectors.toMap(UserRepository.DailySignupRow::getDate, UserRepository.DailySignupRow::getCount));
        assertThat(byDate).containsEntry(today.minusDays(1), 2L);
        assertThat(byDate).containsEntry(today, 1L);
        assertThat(byDate).doesNotContainKey(today.minusDays(10));
    }
}
