package com.back.user.dto;

import com.back.user.entity.AuthProvider;
import com.back.user.entity.User;

import java.time.LocalDateTime;

public record UserResponse(
        Long id,
        AuthProvider provider,
        String nickname,
        String email,
        LocalDateTime createdAt
) {
    public static UserResponse from(User user) {
        return new UserResponse(user.getId(), user.getProvider(), user.getNickname(), user.getEmail(), user.getCreatedAt());
    }
}
