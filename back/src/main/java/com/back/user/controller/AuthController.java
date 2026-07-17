package com.back.user.controller;

import com.back.global.security.jwt.AccessTokenRevocationService;
import com.back.global.security.jwt.BearerTokenExtractor;
import com.back.user.dto.LogoutRequest;
import com.back.user.dto.RefreshRequest;
import com.back.user.dto.TokenPair;
import com.back.user.service.RefreshTokenService;
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
public class AuthController {

    private final RefreshTokenService refreshTokenService;
    private final AccessTokenRevocationService accessTokenRevocationService;

    @PostMapping("/refresh")
    public TokenPair refresh(@RequestBody RefreshRequest request) {
        return refreshTokenService.rotate(request.refreshToken());
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@AuthenticationPrincipal Long userId, @RequestBody LogoutRequest request,
                        HttpServletRequest httpRequest) {
        refreshTokenService.revoke(request.refreshToken(), userId);
        BearerTokenExtractor.extract(httpRequest).ifPresent(accessTokenRevocationService::revoke);
    }
}
