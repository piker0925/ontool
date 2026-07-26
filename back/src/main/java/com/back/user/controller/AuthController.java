package com.back.user.controller;

import com.back.global.exception.AppException;
import com.back.global.exception.ErrorCode;
import com.back.global.ratelimit.ClientIpResolver;
import com.back.global.security.jwt.AccessTokenRevocationService;
import com.back.global.security.jwt.BearerTokenExtractor;
import com.back.user.dto.LogoutRequest;
import com.back.user.dto.RefreshRequest;
import com.back.user.dto.TokenPair;
import com.back.user.service.RefreshTokenService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "인증 (Auth)", description = "액세스/리프레시 토큰 재발급·로그아웃 API (소셜 로그인 자체는 OAuth2 리다이렉트로 처리)")
public class AuthController {

    private final RefreshTokenService refreshTokenService;
    private final AccessTokenRevocationService accessTokenRevocationService;

    @Operation(summary = "토큰 재발급", description = "refresh token으로 새 액세스/리프레시 토큰 쌍을 발급받습니다(토큰 회전). 탈취가 감지되면 실패합니다.")
    @PostMapping("/refresh")
    public TokenPair refresh(@RequestBody RefreshRequest request, HttpServletRequest httpRequest) {
        return refreshTokenService.rotate(request.refreshToken(), ClientIpResolver.resolve(httpRequest))
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_REFRESH_TOKEN));
    }

    @Operation(summary = "로그아웃", description = "refresh token을 폐기하고, 요청에 담긴 access token도 즉시 무효화(블랙리스트) 처리합니다.")
    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@AuthenticationPrincipal Long userId, @RequestBody LogoutRequest request,
                        HttpServletRequest httpRequest) {
        refreshTokenService.revoke(request.refreshToken(), userId);
        BearerTokenExtractor.extract(httpRequest).ifPresent(accessTokenRevocationService::revoke);
    }
}
