package com.back.user.controller;

import com.back.user.dto.NicknameUpdateRequest;
import com.back.user.dto.UserResponse;
import com.back.user.entity.User;
import com.back.user.service.SocialUnlinkService;
import com.back.user.service.UserService;
import com.back.user.service.UserWithdrawalService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@Tag(name = "회원 (User)", description = "로그인 회원 본인 정보 조회·닉네임 변경·탈퇴 API")
public class UserController {

    private final UserService userService;
    private final UserWithdrawalService userWithdrawalService;
    private final SocialUnlinkService socialUnlinkService;

    @Operation(summary = "내 정보 조회", description = "로그인한 회원 본인의 정보를 조회합니다.")
    @GetMapping
    public UserResponse me(@AuthenticationPrincipal Long userId) {
        return UserResponse.from(userService.getById(userId));
    }

    @Operation(summary = "닉네임 변경", description = "로그인한 회원 본인의 닉네임을 변경합니다.")
    @PatchMapping
    public UserResponse updateNickname(@AuthenticationPrincipal Long userId,
                                        @Valid @RequestBody NicknameUpdateRequest request) {
        return UserResponse.from(userService.updateNickname(userId, request.nickname()));
    }

    @Operation(summary = "회원 탈퇴", description = "로그인한 회원 본인 계정을 탈퇴 처리하고, 연동된 소셜 계정 연결도 최선 노력(best-effort)으로 해제합니다.")
    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void withdraw(@AuthenticationPrincipal Long userId) {
        User user = userWithdrawalService.withdraw(userId);
        socialUnlinkService.bestEffortUnlink(user);
    }
}
