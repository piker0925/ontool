package com.back.personalization.controller;

import com.back.AbstractMySQLIntegrationTest;
import com.back.global.security.jwt.JwtProvider;
import com.back.personalization.entity.UserRecentTool;
import com.back.personalization.repository.UserRecentToolRepository;
import com.back.stats.entity.ToolStats;
import com.back.stats.repository.ToolStatsRepository;
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

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
class PersonalizationControllerTest extends AbstractMySQLIntegrationTest {

    @Autowired
    WebApplicationContext wac;
    @Autowired
    UserRepository userRepository;
    @Autowired
    JwtProvider jwtProvider;
    @Autowired
    ToolStatsRepository toolStatsRepository;
    @Autowired
    UserRecentToolRepository userRecentToolRepository;

    MockMvc mockMvc;

    @BeforeEach
    void setup() {
        userRepository.deleteAll();
        toolStatsRepository.deleteAll();
        mockMvc = MockMvcBuilders.webAppContextSetup(wac).apply(springSecurity()).build();
    }

    @Test
    void get_인증없이_요청하면_401() throws Exception {
        mockMvc.perform(get("/api/v1/users/me/personalization"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    void get_신규_유저는_전부_빈_배열이다() throws Exception {
        User user = userRepository.save(new User(AuthProvider.GOOGLE, "p1", null, "유저"));
        String token = jwtProvider.issueAccessToken(user.getId());

        mockMvc.perform(get("/api/v1/users/me/personalization").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.favorites").isArray())
                .andExpect(jsonPath("$.favorites.length()").value(0))
                .andExpect(jsonPath("$.recentTools").isArray())
                .andExpect(jsonPath("$.recentTools.length()").value(0))
                .andExpect(jsonPath("$.likes").isArray())
                .andExpect(jsonPath("$.likes.length()").value(0));
    }

    @Test
    void 즐겨찾기_추가하면_목록에_나타나고_한번더_추가해도_중복되지_않는다() throws Exception {
        User user = userRepository.save(new User(AuthProvider.GOOGLE, "p2", null, "유저"));
        String token = jwtProvider.issueAccessToken(user.getId());

        mockMvc.perform(post("/api/v1/users/me/personalization/favorites/sha256")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
        mockMvc.perform(post("/api/v1/users/me/personalization/favorites/sha256")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/v1/users/me/personalization").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.favorites.length()").value(1))
                .andExpect(jsonPath("$.favorites[0]").value("sha256"));
    }

    @Test
    void 즐겨찾기_삭제하면_목록에서_사라지고_없는_것을_삭제해도_에러없다() throws Exception {
        User user = userRepository.save(new User(AuthProvider.GOOGLE, "p3", null, "유저"));
        String token = jwtProvider.issueAccessToken(user.getId());
        mockMvc.perform(post("/api/v1/users/me/personalization/favorites/sha256")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/v1/users/me/personalization").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.favorites.length()").value(1));

        mockMvc.perform(delete("/api/v1/users/me/personalization/favorites/sha256")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/v1/users/me/personalization/favorites/sha256")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/v1/users/me/personalization").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.favorites.length()").value(0));
    }

    @Test
    void 다른_유저의_즐겨찾기에는_접근할_수_없다() throws Exception {
        User userA = userRepository.save(new User(AuthProvider.GOOGLE, "p4", null, "A"));
        User userB = userRepository.save(new User(AuthProvider.GOOGLE, "p5", null, "B"));
        String tokenA = jwtProvider.issueAccessToken(userA.getId());
        String tokenB = jwtProvider.issueAccessToken(userB.getId());

        mockMvc.perform(post("/api/v1/users/me/personalization/favorites/sha256")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/v1/users/me/personalization").header("Authorization", "Bearer " + tokenB))
                .andExpect(jsonPath("$.favorites.length()").value(0));
        mockMvc.perform(get("/api/v1/users/me/personalization").header("Authorization", "Bearer " + tokenA))
                .andExpect(jsonPath("$.favorites.length()").value(1));
    }

    @Test
    void 최근사용_기록하면_최신순으로_나타나고_재기록시_맨앞으로_온다() throws Exception {
        User user = userRepository.save(new User(AuthProvider.GOOGLE, "p6", null, "유저"));
        String token = jwtProvider.issueAccessToken(user.getId());

        recordRecentTool(token, "sha256");
        Thread.sleep(5);
        recordRecentTool(token, "json-format");

        mockMvc.perform(get("/api/v1/users/me/personalization").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.recentTools[0]").value("json-format"))
                .andExpect(jsonPath("$.recentTools[1]").value("sha256"))
                .andExpect(jsonPath("$.recentTools.length()").value(2));

        Thread.sleep(5);
        recordRecentTool(token, "sha256");

        mockMvc.perform(get("/api/v1/users/me/personalization").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.recentTools[0]").value("sha256"))
                .andExpect(jsonPath("$.recentTools[1]").value("json-format"))
                .andExpect(jsonPath("$.recentTools.length()").value(2));
    }

    @Test
    void 최근사용은_최대_6개만_유지하고_가장_오래된_것부터_밀려난다() throws Exception {
        User user = userRepository.save(new User(AuthProvider.GOOGLE, "p7", null, "유저"));
        String token = jwtProvider.issueAccessToken(user.getId());

        for (int i = 1; i <= 7; i++) {
            recordRecentTool(token, "tool-" + i);
            Thread.sleep(5);
        }

        mockMvc.perform(get("/api/v1/users/me/personalization").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.recentTools.length()").value(6))
                .andExpect(jsonPath("$.recentTools[0]").value("tool-7"))
                .andExpect(jsonPath("$.recentTools[5]").value("tool-2"))
                .andExpect(jsonPath("$.recentTools", org.hamcrest.Matchers.not(org.hamcrest.Matchers.hasItem("tool-1"))));
    }

    private void recordRecentTool(String token, String moduleId) throws Exception {
        mockMvc.perform(post("/api/v1/users/me/personalization/recent-tools/" + moduleId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
    }

    @Test
    void 병합하면_기존_즐겨찾기와_합집합이_되고_중복은_한번만_남는다() throws Exception {
        User user = userRepository.save(new User(AuthProvider.GOOGLE, "p8", null, "유저"));
        String token = jwtProvider.issueAccessToken(user.getId());
        mockMvc.perform(post("/api/v1/users/me/personalization/favorites/a")
                        .header("Authorization", "Bearer " + token));

        mockMvc.perform(post("/api/v1/users/me/personalization/merge")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"favorites\": [\"a\", \"b\"], \"recentTools\": [], \"likes\": []}"))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/v1/users/me/personalization").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.favorites.length()").value(2))
                .andExpect(jsonPath("$.favorites", org.hamcrest.Matchers.containsInAnyOrder("a", "b")));
    }

    @Test
    void 병합해도_이미_반영된_좋아요의_전역카운트를_다시_올리지_않는다() throws Exception {
        User user = userRepository.save(new User(AuthProvider.GOOGLE, "p9", null, "유저"));
        String token = jwtProvider.issueAccessToken(user.getId());
        ToolStats preLiked = new ToolStats("already-liked-anon");
        preLiked.setLikeCount(5);
        toolStatsRepository.save(preLiked);

        mockMvc.perform(post("/api/v1/users/me/personalization/merge")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"favorites\": [], \"recentTools\": [], \"likes\": [\"already-liked-anon\"]}"))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/v1/users/me/personalization").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.likes").value(org.hamcrest.Matchers.contains("already-liked-anon")));
        mockMvc.perform(get("/api/v1/tools/already-liked-anon/stats"))
                .andExpect(jsonPath("$.likeCount").value(5));
    }

    @Test
    void 같은_병합을_두번_호출해도_중복되지_않는다() throws Exception {
        User user = userRepository.save(new User(AuthProvider.GOOGLE, "p10", null, "유저"));
        String token = jwtProvider.issueAccessToken(user.getId());
        String body = "{\"favorites\": [\"a\"], \"recentTools\": [], \"likes\": []}";

        mockMvc.perform(post("/api/v1/users/me/personalization/merge")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isNoContent());
        mockMvc.perform(post("/api/v1/users/me/personalization/merge")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/v1/users/me/personalization").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.favorites.length()").value(1));
    }

    @Test
    void 병합의_최근사용목록도_순서를_보존하며_반영되고_6개_상한이_적용된다() throws Exception {
        User user = userRepository.save(new User(AuthProvider.GOOGLE, "p11", null, "유저"));
        String token = jwtProvider.issueAccessToken(user.getId());
        // 이미 서버에 있던 항목 — 아주 오래전에 쓰인 것으로 심어서 병합 후 우선순위 다툼에서 확실히 밀려나게 한다.
        userRecentToolRepository.save(new UserRecentTool(user.getId(), "existing", java.time.LocalDateTime.now().minusDays(1)));

        mockMvc.perform(post("/api/v1/users/me/personalization/merge")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"favorites\": [], \"likes\": [], " +
                                "\"recentTools\": [\"new1\", \"new2\", \"new3\", \"new4\", \"new5\", \"new6\", \"existing\"]}"))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/v1/users/me/personalization").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.recentTools.length()").value(6))
                .andExpect(jsonPath("$.recentTools").value(org.hamcrest.Matchers.contains(
                        "new1", "new2", "new3", "new4", "new5", "new6")))
                .andExpect(jsonPath("$.recentTools", org.hamcrest.Matchers.not(org.hamcrest.Matchers.hasItem("existing"))));
    }

    @Test
    void 병합_요청에서_필드가_빠져도_500이_아니라_204다() throws Exception {
        User user = userRepository.save(new User(AuthProvider.GOOGLE, "p12", null, "유저"));
        String token = jwtProvider.issueAccessToken(user.getId());

        mockMvc.perform(post("/api/v1/users/me/personalization/merge")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isNoContent());
    }
}
