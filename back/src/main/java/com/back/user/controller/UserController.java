package com.back.user.controller;

import com.back.user.dto.NicknameUpdateRequest;
import com.back.user.dto.UserResponse;
import com.back.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users/me")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping
    public UserResponse me(@AuthenticationPrincipal Long userId) {
        return UserResponse.from(userService.getById(userId));
    }

    @PatchMapping
    public UserResponse updateNickname(@AuthenticationPrincipal Long userId,
                                        @Valid @RequestBody NicknameUpdateRequest request) {
        return UserResponse.from(userService.updateNickname(userId, request.nickname()));
    }
}
