package com.back.user.service;

import com.back.global.exception.AppException;
import com.back.global.exception.ErrorCode;
import com.back.user.entity.AuthProvider;
import com.back.user.entity.User;
import com.back.user.oauth2.OAuth2UserAttributes;
import com.back.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

    private static final int NICKNAME_MAX_LENGTH = 20;
    private static final String DEFAULT_NICKNAME = "사용자";

    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public User getById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED));
    }

    @Transactional
    public User updateNickname(Long userId, String nickname) {
        User user = getById(userId);
        user.setNickname(nickname);
        return user;
    }

    @Transactional
    public User upsertFromSocialLogin(OAuth2UserAttributes attrs) {
        return upsertFromSocialLogin(attrs.provider(), attrs.providerId(), attrs.email(), attrs.nickname());
    }

    // 재로그인 시 소셜 프로필명으로 기존 닉네임을 덮어쓰지 않는다(ADR-0024) — 첫 로그인일 때만 새로 만든다.
    @Transactional
    public User upsertFromSocialLogin(AuthProvider provider, String providerId, String email, String socialNickname) {
        return userRepository.findByProviderAndProviderId(provider, providerId)
                .orElseGet(() -> userRepository.save(new User(provider, providerId, email, truncateNickname(socialNickname))));
    }

    private String truncateNickname(String nickname) {
        String trimmed = (nickname == null || nickname.isBlank()) ? DEFAULT_NICKNAME : nickname.trim();
        return trimmed.length() > NICKNAME_MAX_LENGTH ? trimmed.substring(0, NICKNAME_MAX_LENGTH) : trimmed;
    }
}
