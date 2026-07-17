package com.back.user.controller;

import com.back.AbstractMySQLIntegrationTest;
import com.back.global.security.jwt.JwtProvider;
import com.back.user.entity.AuthProvider;
import com.back.user.entity.User;
import com.back.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
class UserControllerTest extends AbstractMySQLIntegrationTest {

    @Autowired
    WebApplicationContext wac;
    @Autowired
    UserRepository userRepository;
    @Autowired
    JwtProvider jwtProvider;

    MockMvc mockMvc;

    @BeforeEach
    void setup() {
        userRepository.deleteAll();
        mockMvc = MockMvcBuilders.webAppContextSetup(wac).apply(springSecurity()).build();
    }

    @Test
    void me_인증없이_요청하면_401() throws Exception {
        mockMvc.perform(get("/api/v1/users/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    void me_유효한_토큰이면_본인_정보를_반환한다() throws Exception {
        User user = userRepository.save(new User(AuthProvider.GOOGLE, "g1", "a@test.com", "닉네임A"));
        String token = jwtProvider.issueAccessToken(user.getId());

        mockMvc.perform(get("/api/v1/users/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(user.getId()))
                .andExpect(jsonPath("$.nickname").value("닉네임A"))
                .andExpect(jsonPath("$.email").value("a@test.com"))
                .andExpect(jsonPath("$.provider").value("GOOGLE"));
    }

    @Test
    void me_email이_null인_카카오유저도_정상_응답한다() throws Exception {
        User user = userRepository.save(new User(AuthProvider.KAKAO, "k1", null, "카카오유저"));
        String token = jwtProvider.issueAccessToken(user.getId());

        mockMvc.perform(get("/api/v1/users/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$.provider").value("KAKAO"));
    }

    @Test
    void me_다른_유저가_존재해도_자신의_정보만_반환한다() throws Exception {
        User userA = userRepository.save(new User(AuthProvider.GOOGLE, "a", null, "A유저"));
        userRepository.save(new User(AuthProvider.GOOGLE, "b", null, "B유저"));
        String tokenA = jwtProvider.issueAccessToken(userA.getId());

        mockMvc.perform(get("/api/v1/users/me").header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(userA.getId()))
                .andExpect(jsonPath("$.nickname").value("A유저"));
    }

    @Test
    void patch_닉네임_앞뒤공백을_트림하고_수정한다() throws Exception {
        User user = userRepository.save(new User(AuthProvider.GOOGLE, "g2", null, "기존닉네임"));
        String token = jwtProvider.issueAccessToken(user.getId());

        mockMvc.perform(patch("/api/v1/users/me")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nickname\": \"  새닉네임  \"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nickname").value("새닉네임"));
    }

    @Test
    void patch_2자_미만이면_400_검증실패() throws Exception {
        User user = userRepository.save(new User(AuthProvider.GOOGLE, "g3", null, "닉네임"));
        String token = jwtProvider.issueAccessToken(user.getId());

        mockMvc.perform(patch("/api/v1/users/me")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nickname\": \"a\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.errors[0].field").value("nickname"));
    }

    @Test
    void patch_20자_초과면_400_검증실패() throws Exception {
        User user = userRepository.save(new User(AuthProvider.GOOGLE, "g4", null, "닉네임"));
        String token = jwtProvider.issueAccessToken(user.getId());

        mockMvc.perform(patch("/api/v1/users/me")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nickname\": \"123456789012345678901\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    }

    @Test
    void patch_다른_유저의_닉네임에는_영향을_주지_않는다() throws Exception {
        User userA = userRepository.save(new User(AuthProvider.GOOGLE, "a2", null, "A닉네임"));
        User userB = userRepository.save(new User(AuthProvider.GOOGLE, "b2", null, "B닉네임"));
        String tokenA = jwtProvider.issueAccessToken(userA.getId());

        mockMvc.perform(patch("/api/v1/users/me")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nickname\": \"바뀐닉네임\"}"))
                .andExpect(status().isOk());

        User reloadedB = userRepository.findById(userB.getId()).orElseThrow();
        assertThat(reloadedB.getNickname()).isEqualTo("B닉네임");
    }
}
