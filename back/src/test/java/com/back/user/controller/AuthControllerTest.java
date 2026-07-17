package com.back.user.controller;

import com.back.AbstractMySQLIntegrationTest;
import com.back.global.security.jwt.JwtProvider;
import com.back.global.security.jwt.RevokedAccessTokenRepository;
import com.back.user.dto.TokenPair;
import com.back.user.entity.AuthProvider;
import com.back.user.entity.User;
import com.back.user.repository.RefreshTokenRepository;
import com.back.user.repository.UserRepository;
import com.back.user.service.RefreshTokenService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
class AuthControllerTest extends AbstractMySQLIntegrationTest {

    @Autowired
    WebApplicationContext wac;
    @Autowired
    RefreshTokenRepository refreshTokenRepository;
    @Autowired
    RevokedAccessTokenRepository revokedAccessTokenRepository;
    @Autowired
    UserRepository userRepository;
    @Autowired
    RefreshTokenService refreshTokenService;
    @Autowired
    JwtProvider jwtProvider;

    MockMvc mockMvc;

    @BeforeEach
    void setup() {
        refreshTokenRepository.deleteAll();
        revokedAccessTokenRepository.deleteAll();
        userRepository.deleteAll();
        mockMvc = MockMvcBuilders.webAppContextSetup(wac).apply(springSecurity()).build();
    }

    @Test
    void refresh_유효한_토큰이면_새_토큰쌍을_반환한다() throws Exception {
        TokenPair issued = refreshTokenService.issue(1L);

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\": \"" + issued.refreshToken() + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").value(org.hamcrest.Matchers.not(issued.refreshToken())));
    }

    @Test
    void refresh_존재하지_않는_토큰이면_401() throws Exception {
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\": \"no-such-token\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_REFRESH_TOKEN"));
    }

    @Test
    void logout_인증없이_요청하면_401() throws Exception {
        mockMvc.perform(post("/api/v1/auth/logout")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\": \"whatever\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    void logout_인증하면_204이고_해당_리프레시토큰이_무효화된다() throws Exception {
        TokenPair issued = refreshTokenService.issue(1L);
        String accessToken = issued.accessToken();

        mockMvc.perform(post("/api/v1/auth/logout")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\": \"" + issued.refreshToken() + "\"}"))
                .andExpect(status().isNoContent());

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\": \"" + issued.refreshToken() + "\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_REFRESH_TOKEN"));
    }

    @Test
    void logout_후_같은_access_토큰으로_users_me_요청하면_401() throws Exception {
        User user = userRepository.save(new User(AuthProvider.GOOGLE, "logout-test", null, "닉네임"));
        TokenPair issued = refreshTokenService.issue(user.getId());
        String accessToken = issued.accessToken();

        mockMvc.perform(get("/api/v1/users/me").header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/auth/logout")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\": \"" + issued.refreshToken() + "\"}"))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/v1/users/me").header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    void logout_다른_유저의_리프레시토큰을_지정해도_삭제되지_않는다() throws Exception {
        TokenPair tokenOfUserA = refreshTokenService.issue(1L);
        TokenPair tokenOfUserB = refreshTokenService.issue(2L);
        String accessTokenOfUserA = tokenOfUserA.accessToken();

        // A로 인증했지만 로그아웃 요청 바디에 B의 refreshToken을 넣는다 — B의 토큰은 그대로 살아있어야 한다.
        mockMvc.perform(post("/api/v1/auth/logout")
                        .header("Authorization", "Bearer " + accessTokenOfUserA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\": \"" + tokenOfUserB.refreshToken() + "\"}"))
                .andExpect(status().isNoContent());

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\": \"" + tokenOfUserB.refreshToken() + "\"}"))
                .andExpect(status().isOk());
    }
}
