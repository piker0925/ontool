package com.back.global.security.oauth2;

import com.back.user.dto.TokenPair;
import com.back.user.entity.AuthProvider;
import com.back.user.entity.User;
import com.back.user.oauth2.OAuth2UserAttributes;
import com.back.user.service.RefreshTokenService;
import com.back.user.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OAuth2LoginSuccessHandlerTest {

    @Mock
    UserService userService;
    @Mock
    RefreshTokenService refreshTokenService;
    @Mock
    HttpServletRequest request;
    @Mock
    HttpServletResponse response;

    private OAuth2LoginSuccessHandler handler;

    @BeforeEach
    void setUp() {
        handler = new OAuth2LoginSuccessHandler(userService, refreshTokenService, "http://localhost:5173");
    }

    @Test
    void 구글_로그인_성공시_유저를_upsert하고_토큰프래그먼트로_리다이렉트한다() throws Exception {
        Map<String, Object> claims = Map.of("sub", "google-1", "email", "a@test.com", "name", "홍길동");
        OidcIdToken idToken = new OidcIdToken("id-token-value", Instant.now(), Instant.now().plusSeconds(3600), claims);
        OidcUser oidcUser = new DefaultOidcUser(List.of(new SimpleGrantedAuthority("ROLE_USER")), idToken);
        OAuth2AuthenticationToken authentication =
                new OAuth2AuthenticationToken(oidcUser, oidcUser.getAuthorities(), "google");

        User user = new User(AuthProvider.GOOGLE, "google-1", "a@test.com", "홍길동");
        ReflectionTestUtils.setField(user, "id", 7L);
        when(userService.upsertFromSocialLogin(new OAuth2UserAttributes(AuthProvider.GOOGLE, "google-1", "a@test.com", "홍길동")))
                .thenReturn(user);
        when(refreshTokenService.issue(7L)).thenReturn(new TokenPair("access-abc", "refresh-xyz"));

        handler.onAuthenticationSuccess(request, response, authentication);

        verify(response).sendRedirect("http://localhost:5173/auth/callback#access=access-abc&refresh=refresh-xyz");
    }

    @Test
    void 카카오_로그인_성공시_유저를_upsert하고_토큰프래그먼트로_리다이렉트한다() throws Exception {
        Map<String, Object> kakaoAccount = Map.of("email", "b@test.com", "profile", Map.of("nickname", "카카오유저"));
        Map<String, Object> attributes = Map.of("id", 555L, "kakao_account", kakaoAccount);
        OAuth2User oauth2User = new DefaultOAuth2User(List.of(new SimpleGrantedAuthority("ROLE_USER")), attributes, "id");
        OAuth2AuthenticationToken authentication =
                new OAuth2AuthenticationToken(oauth2User, oauth2User.getAuthorities(), "kakao");

        User user = new User(AuthProvider.KAKAO, "555", "b@test.com", "카카오유저");
        ReflectionTestUtils.setField(user, "id", 9L);
        when(userService.upsertFromSocialLogin(new OAuth2UserAttributes(AuthProvider.KAKAO, "555", "b@test.com", "카카오유저")))
                .thenReturn(user);
        when(refreshTokenService.issue(9L)).thenReturn(new TokenPair("access-kakao", "refresh-kakao"));

        handler.onAuthenticationSuccess(request, response, authentication);

        verify(response).sendRedirect("http://localhost:5173/auth/callback#access=access-kakao&refresh=refresh-kakao");
    }
}
