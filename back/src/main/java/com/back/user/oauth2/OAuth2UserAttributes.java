package com.back.user.oauth2;

import com.back.user.entity.AuthProvider;

import java.util.Map;

public record OAuth2UserAttributes(AuthProvider provider, String providerId, String email, String nickname) {

    public static OAuth2UserAttributes from(String registrationId, Map<String, Object> attributes) {
        return switch (registrationId) {
            case "google" -> ofGoogle(attributes);
            case "kakao" -> ofKakao(attributes);
            default -> throw new IllegalArgumentException("지원하지 않는 로그인 제공자: " + registrationId);
        };
    }

    private static OAuth2UserAttributes ofGoogle(Map<String, Object> attributes) {
        String providerId = String.valueOf(attributes.get("sub"));
        String email = (String) attributes.get("email");
        String nickname = (String) attributes.get("name");
        return new OAuth2UserAttributes(AuthProvider.GOOGLE, providerId, email, nickname);
    }

    @SuppressWarnings("unchecked")
    private static OAuth2UserAttributes ofKakao(Map<String, Object> attributes) {
        String providerId = String.valueOf(attributes.get("id"));
        Map<String, Object> kakaoAccount = (Map<String, Object>) attributes.getOrDefault("kakao_account", Map.of());
        Map<String, Object> profile = (Map<String, Object>) kakaoAccount.getOrDefault("profile", Map.of());
        String email = (String) kakaoAccount.get("email");
        String nickname = (String) profile.get("nickname");
        return new OAuth2UserAttributes(AuthProvider.KAKAO, providerId, email, nickname);
    }
}
