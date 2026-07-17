package com.back.user.oauth2;

import com.back.user.entity.AuthProvider;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class OAuth2UserAttributesTest {

    @Test
    void google_속성에서_sub_email_name을_추출한다() {
        Map<String, Object> attributes = Map.of(
                "sub", "google-123",
                "email", "a@test.com",
                "name", "홍길동"
        );

        OAuth2UserAttributes result = OAuth2UserAttributes.from("google", attributes);

        assertThat(result.provider()).isEqualTo(AuthProvider.GOOGLE);
        assertThat(result.providerId()).isEqualTo("google-123");
        assertThat(result.email()).isEqualTo("a@test.com");
        assertThat(result.nickname()).isEqualTo("홍길동");
    }

    @Test
    void kakao_중첩된_kakao_account에서_email과_nickname을_추출한다() {
        Map<String, Object> profile = Map.of("nickname", "카카오유저");
        Map<String, Object> kakaoAccount = Map.of("email", "b@test.com", "profile", profile);
        Map<String, Object> attributes = Map.of("id", 123456789L, "kakao_account", kakaoAccount);

        OAuth2UserAttributes result = OAuth2UserAttributes.from("kakao", attributes);

        assertThat(result.provider()).isEqualTo(AuthProvider.KAKAO);
        assertThat(result.providerId()).isEqualTo("123456789");
        assertThat(result.email()).isEqualTo("b@test.com");
        assertThat(result.nickname()).isEqualTo("카카오유저");
    }

    @Test
    void kakao_이메일_동의항목이_없으면_email은_null이다() {
        Map<String, Object> profile = Map.of("nickname", "카카오유저");
        Map<String, Object> kakaoAccount = Map.of("profile", profile);
        Map<String, Object> attributes = Map.of("id", 999L, "kakao_account", kakaoAccount);

        OAuth2UserAttributes result = OAuth2UserAttributes.from("kakao", attributes);

        assertThat(result.email()).isNull();
        assertThat(result.nickname()).isEqualTo("카카오유저");
    }

    @Test
    void 지원하지_않는_provider면_예외() {
        assertThatThrownBy(() -> OAuth2UserAttributes.from("naver", new HashMap<>()))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
