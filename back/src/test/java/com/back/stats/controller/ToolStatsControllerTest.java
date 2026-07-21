package com.back.stats.controller;

import com.back.AbstractMySQLIntegrationTest;
import com.back.global.security.jwt.JwtProvider;
import com.back.stats.repository.ToolStatsRepository;
import com.back.user.entity.AuthProvider;
import com.back.user.entity.User;
import com.back.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
class ToolStatsControllerTest extends AbstractMySQLIntegrationTest {

    @Autowired
    WebApplicationContext wac;
    @Autowired
    UserRepository userRepository;
    @Autowired
    ToolStatsRepository toolStatsRepository;
    @Autowired
    JwtProvider jwtProvider;

    MockMvc mockMvc;

    @BeforeEach
    void setup() {
        userRepository.deleteAll();
        toolStatsRepository.deleteAll();
        mockMvc = MockMvcBuilders.webAppContextSetup(wac).apply(springSecurity()).build();
    }

    @Test
    void 로그인_유저가_좋아요하면_전역카운트가_오르고_개인화_목록에도_남는다() throws Exception {
        User user = userRepository.save(new User(AuthProvider.GOOGLE, "l1", null, "유저"));
        String token = jwtProvider.issueAccessToken(user.getId());

        mockMvc.perform(post("/api/v1/tools/sha256/like").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.likeCount").value(1));

        mockMvc.perform(get("/api/v1/users/me/personalization").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.likes.length()").value(1))
                .andExpect(jsonPath("$.likes[0]").value("sha256"));
    }

    @Test
    void 로그인_유저가_같은_모듈을_두번_좋아요해도_전역카운트는_한번만_오른다() throws Exception {
        User user = userRepository.save(new User(AuthProvider.GOOGLE, "l2", null, "유저"));
        String token = jwtProvider.issueAccessToken(user.getId());

        mockMvc.perform(post("/api/v1/tools/sha256/like").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.likeCount").value(1));
        mockMvc.perform(post("/api/v1/tools/sha256/like").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.likeCount").value(1));

        mockMvc.perform(get("/api/v1/users/me/personalization").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.likes.length()").value(1));
    }

    @Test
    void 로그인_유저가_좋아요_취소하면_전역카운트가_내려가고_개인화_목록에서_사라진다() throws Exception {
        User user = userRepository.save(new User(AuthProvider.GOOGLE, "l3", null, "유저"));
        String token = jwtProvider.issueAccessToken(user.getId());
        mockMvc.perform(post("/api/v1/tools/sha256/like").header("Authorization", "Bearer " + token));

        mockMvc.perform(delete("/api/v1/tools/sha256/like").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.likeCount").value(0));

        mockMvc.perform(get("/api/v1/users/me/personalization").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.likes.length()").value(0));
    }

    @Test
    void 로그인_유저가_좋아요_안한_모듈을_취소해도_카운트가_음수로_내려가지_않는다() throws Exception {
        User user = userRepository.save(new User(AuthProvider.GOOGLE, "l4", null, "유저"));
        String token = jwtProvider.issueAccessToken(user.getId());

        mockMvc.perform(delete("/api/v1/tools/sha256/like").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.likeCount").value(0));
    }

    @Test
    void 비로그인_유저의_좋아요는_기존과_동일하게_전역카운트만_바뀐다() throws Exception {
        mockMvc.perform(post("/api/v1/tools/sha256/like"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.likeCount").value(1));
        mockMvc.perform(post("/api/v1/tools/sha256/like"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.likeCount").value(2));
    }

    @Test
    void 프론트_전용_도구는_use_호출로_비로그인_상태에서도_사용횟수가_오른다() throws Exception {
        mockMvc.perform(post("/api/v1/tools/lotto-number/use"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.moduleId").value("lotto-number"))
                .andExpect(jsonPath("$.useCount").value(1));
        mockMvc.perform(post("/api/v1/tools/lotto-number/use"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.useCount").value(2));
    }
}
