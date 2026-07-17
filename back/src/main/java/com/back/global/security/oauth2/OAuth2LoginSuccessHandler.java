package com.back.global.security.oauth2;

import com.back.user.dto.TokenPair;
import com.back.user.entity.User;
import com.back.user.oauth2.OAuth2UserAttributes;
import com.back.user.service.RefreshTokenService;
import com.back.user.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class OAuth2LoginSuccessHandler implements AuthenticationSuccessHandler {

    private final UserService userService;
    private final RefreshTokenService refreshTokenService;
    private final String frontendUrl;

    public OAuth2LoginSuccessHandler(UserService userService,
                                      RefreshTokenService refreshTokenService,
                                      @Value("${app.frontend-url}") String frontendUrl) {
        this.userService = userService;
        this.refreshTokenService = refreshTokenService;
        this.frontendUrl = frontendUrl;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                         Authentication authentication) throws IOException {
        OAuth2AuthenticationToken oauthToken = (OAuth2AuthenticationToken) authentication;
        OAuth2User oauth2User = oauthToken.getPrincipal();

        OAuth2UserAttributes attrs = OAuth2UserAttributes.from(
                oauthToken.getAuthorizedClientRegistrationId(), oauth2User.getAttributes());
        User user = userService.upsertFromSocialLogin(attrs);

        TokenPair tokens = refreshTokenService.issue(user.getId());

        response.sendRedirect(frontendUrl + "/auth/callback#access=" + tokens.accessToken()
                + "&refresh=" + tokens.refreshToken());
    }
}
