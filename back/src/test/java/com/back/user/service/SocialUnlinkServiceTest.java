package com.back.user.service;

import com.back.user.entity.AuthProvider;
import com.back.user.entity.User;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatCode;

class SocialUnlinkServiceTest {

    private final SocialUnlinkService service = new SocialUnlinkService();

    @Test
    void 카카오_사용자는_예외없이_처리된다() {
        User user = new User(AuthProvider.KAKAO, "kakao-1", "a@test.com", "닉네임");

        assertThatCode(() -> service.bestEffortUnlink(user)).doesNotThrowAnyException();
    }

    @Test
    void 구글_사용자는_예외없이_처리된다() {
        User user = new User(AuthProvider.GOOGLE, "google-1", "b@test.com", "닉네임");

        assertThatCode(() -> service.bestEffortUnlink(user)).doesNotThrowAnyException();
    }
}
