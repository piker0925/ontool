package com.back.global.security.oauth2;

import com.back.user.dto.TokenPair;
import com.back.user.entity.User;
import com.back.user.oauth2.OAuth2UserAttributes;
import com.back.user.service.RefreshTokenService;
import com.back.user.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Slf4j
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
        try {
            OAuth2AuthenticationToken oauthToken = (OAuth2AuthenticationToken) authentication;
            OAuth2User oauth2User = oauthToken.getPrincipal();

            OAuth2UserAttributes attrs = OAuth2UserAttributes.from(
                    oauthToken.getAuthorizedClientRegistrationId(), oauth2User.getAttributes());
            User user = userService.upsertFromSocialLogin(attrs);

            TokenPair tokens = refreshTokenService.issue(user.getId());

            // OAuth2 인가 요청(state) 보관 목적으로만 쓰인 HTTP 세션 — 발급 이후로는 우리 인증 체계가
            // JWT만 신뢰해야 하는데, 세션을 살려두면 SecurityContext가 세션에 남아 로그아웃/토큰 폐기와
            // 무관하게 인증된 상태로 남는 별도 경로가 생긴다. 용도가 끝났으니 여기서 끊는다.
            invalidateSession(request);

            response.sendRedirect(frontendUrl + "/auth/callback#access=" + tokens.accessToken()
                    + "&refresh=" + tokens.refreshToken());
        } catch (Exception e) {
            // 사용자 upsert·토큰 발급 중 무엇이 실패하든(예상치 못한 provider 응답 형태, DB 문제 등)
            // 스프링 시큐리티 필터체인 안에서 던지면 GlobalExceptionHandler가 못 잡고 500 에러 페이지가
            // 뜬다 — 실패 핸들러와 동일한 프론트 콜백으로 보내 사용자가 최소한 랜딩으로는 돌아가게 한다.
            log.error("소셜 로그인 성공 처리 중 실패", e);
            response.sendRedirect(frontendUrl + "/auth/callback#error=login_failed");
        }
    }

    private void invalidateSession(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        SecurityContextHolder.clearContext();
    }
}
