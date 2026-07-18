package com.back.user.controller;

import com.back.user.dto.NicknameUpdateRequest;
import com.back.user.dto.UserResponse;
import com.back.user.entity.User;
import com.back.user.service.SocialUnlinkService;
import com.back.user.service.UserService;
import com.back.user.service.UserWithdrawalService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users/me")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final UserWithdrawalService userWithdrawalService;
    private final SocialUnlinkService socialUnlinkService;

    @GetMapping
    public UserResponse me(@AuthenticationPrincipal Long userId) {
        return UserResponse.from(userService.getById(userId));
    }

    @PatchMapping
    public UserResponse updateNickname(@AuthenticationPrincipal Long userId,
                                        @Valid @RequestBody NicknameUpdateRequest request) {
        return UserResponse.from(userService.updateNickname(userId, request.nickname()));
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void withdraw(@AuthenticationPrincipal Long userId) {
        User user = userWithdrawalService.withdraw(userId);
        socialUnlinkService.bestEffortUnlink(user);
    }
}
