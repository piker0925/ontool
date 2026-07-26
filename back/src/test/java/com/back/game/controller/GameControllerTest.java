package com.back.game.controller;

import com.back.AbstractMySQLIntegrationTest;
import com.back.game.repository.GameScoreRepository;
import com.back.global.security.jwt.JwtProvider;
import com.back.user.entity.AuthProvider;
import com.back.user.entity.User;
import com.back.user.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("local")
@TestPropertySource(properties = {
        "storage.upload-dir=build/test-uploads",
        "scheduling.worker.delay=60000",
        "scheduling.ttl.delay=60000",
        "ratelimit.game-score.max-per-window=2",
        "ratelimit.game-score.window-seconds=60"
})
class GameControllerTest extends AbstractMySQLIntegrationTest {

    @Autowired
    WebApplicationContext wac;
    @Autowired
    UserRepository userRepository;
    @Autowired
    GameScoreRepository gameScoreRepository;
    @Autowired
    JwtProvider jwtProvider;

    MockMvc mockMvc;
    ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setup() {
        gameScoreRepository.deleteAll();
        userRepository.deleteAll();
        mockMvc = MockMvcBuilders.webAppContextSetup(wac).apply(springSecurity()).build();
    }

    @Test
    void 존재하지_않는_게임의_세션_발급은_404() throws Exception {
        mockMvc.perform(post("/api/v1/games/game-not-real/session"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("GAME_NOT_FOUND"));
    }

    @Test
    void 비로그인으로_점수_제출하면_401() throws Exception {
        String token = startSession("game-baseball");

        mockMvc.perform(post("/api/v1/games/game-baseball/scores")
                        .contentType("application/json")
                        .content(scoreBody(1, token)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void 세션_토큰이_없으면_점수_제출이_거부된다() throws Exception {
        User user = saveUser("s1", "유저1");
        String accessToken = jwtProvider.issueAccessToken(user.getId());

        mockMvc.perform(post("/api/v1/games/game-baseball/scores")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType("application/json")
                        .content(scoreBody(1, "garbage-token")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("GAME_SESSION_INVALID"));
    }

    @Test
    void 최소_플레이_시간을_채우지_않으면_거부된다() throws Exception {
        User user = saveUser("s2", "유저2");
        String accessToken = jwtProvider.issueAccessToken(user.getId());
        String sessionToken = startSession("game-baseball"); // minDurationMs=300

        // 발급 직후 곧바로 제출 — 300ms를 못 채웠으므로 거부되어야 한다.
        mockMvc.perform(post("/api/v1/games/game-baseball/scores")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType("application/json")
                        .content(scoreBody(1, sessionToken)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("GAME_SESSION_INVALID"));
    }

    @Test
    void 로그인_유저는_최소_플레이_시간을_채우면_점수를_제출하고_리더보드에_반영된다() throws Exception {
        User user = saveUser("s3", "유저3");
        String accessToken = jwtProvider.issueAccessToken(user.getId());
        String sessionToken = startSession("game-baseball");

        Thread.sleep(450);

        mockMvc.perform(post("/api/v1/games/game-baseball/scores")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType("application/json")
                        .content(scoreBody(1, sessionToken)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.score").value(1))
                .andExpect(jsonPath("$.gameId").value("game-baseball"));

        mockMvc.perform(get("/api/v1/games/game-baseball/leaderboard"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.topScores.length()").value(1))
                .andExpect(jsonPath("$.topScores[0].nickname").value("유저3"))
                .andExpect(jsonPath("$.topScores[0].score").value(1));
    }

    @Test
    void 점수_제출_응답에_이번_판_순위가_포함된다() throws Exception {
        // game-2048(higherIsBetter=true) — 서로 다른 유저 3명이 순서대로 10 → 30 → 20을 제출한다.
        // "이번 제출 순위"는 내 역대 최고 기록이 아니라 방금 저장된 그 점수 하나의 순위여야 한다.
        User user1 = saveUser("r1", "랭커1");
        User user2 = saveUser("r2", "랭커2");
        User user3 = saveUser("r3", "랭커3");

        // 첫 제출 — 아직 아무도 없으므로 1등
        submitAndExpectRank(user1, "game-2048", 10, 1);
        // 10보다 높은 30 제출 — 지금까지 중 최고이므로 1등
        submitAndExpectRank(user2, "game-2048", 30, 1);
        // 30보다는 낮고 10보다는 높은 20 제출 — 30 하나만 더 좋으므로 2등
        submitAndExpectRank(user3, "game-2048", 20, 2);
    }

    private void submitAndExpectRank(User user, String gameId, int score, long expectedRank) throws Exception {
        String accessToken = jwtProvider.issueAccessToken(user.getId());
        String sessionToken = startSession(gameId);
        Thread.sleep(600);

        mockMvc.perform(post("/api/v1/games/" + gameId + "/scores")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType("application/json")
                        .content(scoreBody(score, sessionToken)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.score").value(score))
                .andExpect(jsonPath("$.rank").value(expectedRank));
    }

    @Test
    void 반응속도_게임은_80ms_미만_점수를_거부한다() throws Exception {
        User user = saveUser("s4", "유저4");
        String accessToken = jwtProvider.issueAccessToken(user.getId());
        String sessionToken = startSession("game-reaction-time"); // minDurationMs=900

        Thread.sleep(950);

        mockMvc.perform(post("/api/v1/games/game-reaction-time/scores")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType("application/json")
                        .content(scoreBody(50, sessionToken)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("GAME_SCORE_IMPLAUSIBLE"));
    }

    @Test
    void 반응속도_게임은_80ms_이상_점수는_정상_등록된다() throws Exception {
        User user = saveUser("s5", "유저5");
        String accessToken = jwtProvider.issueAccessToken(user.getId());
        String sessionToken = startSession("game-reaction-time");

        Thread.sleep(950);

        mockMvc.perform(post("/api/v1/games/game-reaction-time/scores")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType("application/json")
                        .content(scoreBody(180, sessionToken)))
                .andExpect(status().isCreated());
    }

    @Test
    void game2048_점수_시간_비율이_비정상적으로_높으면_거부된다() throws Exception {
        User user = saveUser("s6", "유저6");
        String accessToken = jwtProvider.issueAccessToken(user.getId());
        String sessionToken = startSession("game-2048"); // minDurationMs=500, maxScorePerMs=2.0

        Thread.sleep(550);

        // 약 550ms 경과 시점에 상한(2.0 * 550 = 1100)을 훌쩍 넘는 점수를 제출
        mockMvc.perform(post("/api/v1/games/game-2048/scores")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType("application/json")
                        .content(scoreBody(100000, sessionToken)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("GAME_SCORE_IMPLAUSIBLE"));
    }

    @Test
    void 리더보드는_점수_오름차순_게임에서_낮은_점수가_먼저_나온다() throws Exception {
        User a = saveUser("s7a", "느린유저");
        User b = saveUser("s7b", "빠른유저");
        submitDirectly("game-reaction-time", a.getId(), 300, 1000);
        submitDirectly("game-reaction-time", b.getId(), 150, 1000);

        mockMvc.perform(get("/api/v1/games/game-reaction-time/leaderboard"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.topScores[0].nickname").value("빠른유저"))
                .andExpect(jsonPath("$.topScores[0].score").value(150))
                .andExpect(jsonPath("$.topScores[1].nickname").value("느린유저"));
    }

    @Test
    void 리더보드_조회는_비로그인도_가능하다() throws Exception {
        mockMvc.perform(get("/api/v1/games/game-2048/leaderboard"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.topScores.length()").value(0))
                .andExpect(jsonPath("$.myBest").doesNotExist());
    }

    @Test
    void 로그인_유저의_리더보드_조회에는_내_순위가_포함된다() throws Exception {
        User me = saveUser("s8", "나");
        User rival = saveUser("s8r", "상대");
        submitDirectly("game-baseball", rival.getId(), 3, 1000); // 오름차순: 3회가 더 좋음
        submitDirectly("game-baseball", me.getId(), 5, 1000);
        String accessToken = jwtProvider.issueAccessToken(me.getId());

        mockMvc.perform(get("/api/v1/games/game-baseball/leaderboard")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.myBest").value(5))
                .andExpect(jsonPath("$.myRank").value(2));
    }

    @Test
    void 유저당_게임당_제출_빈도_상한을_넘으면_거부된다() throws Exception {
        User user = saveUser("s9", "유저9");
        String accessToken = jwtProvider.issueAccessToken(user.getId());
        String sessionToken = startSession("game-baseball");
        Thread.sleep(450);

        // 같은 세션 토큰을 재사용한 반복 제출 — 토큰 검증만으론 막히지 않으므로 레이트리밋이 막아야 한다.
        // (max-per-window=2로 낮춰 테스트)
        mockMvc.perform(post("/api/v1/games/game-baseball/scores")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType("application/json")
                        .content(scoreBody(1, sessionToken)))
                .andExpect(status().isCreated());
        mockMvc.perform(post("/api/v1/games/game-baseball/scores")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType("application/json")
                        .content(scoreBody(1, sessionToken)))
                .andExpect(status().isCreated());
        mockMvc.perform(post("/api/v1/games/game-baseball/scores")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType("application/json")
                        .content(scoreBody(1, sessionToken)))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("RATE_LIMITED"));
    }

    @Test
    void 신규_점수_게임도_세션_검증_후_제출되고_리더보드에_반영된다() throws Exception {
        // 121: 높을수록 좋은 신규 게임(예: 블록 블라스트)이 기존 8개와 같은 배선을 타는지 확인.
        User user = saveUser("s10", "유저10");
        String accessToken = jwtProvider.issueAccessToken(user.getId());
        String sessionToken = startSession("game-block-blast");

        Thread.sleep(450);

        mockMvc.perform(post("/api/v1/games/game-block-blast/scores")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType("application/json")
                        .content(scoreBody(12, sessionToken)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.score").value(12))
                .andExpect(jsonPath("$.gameId").value("game-block-blast"));

        mockMvc.perform(get("/api/v1/games/game-block-blast/leaderboard"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.topScores[0].nickname").value("유저10"))
                .andExpect(jsonPath("$.topScores[0].score").value(12));
    }

    @Test
    void 신규_적을수록_좋은_게임도_세션_검증_후_제출되고_리더보드에_반영된다() throws Exception {
        // 121: 적을수록 좋은 신규 게임(예: 워터소트 퍼즐)이 오름차순 정렬로 등록되는지 확인.
        User user = saveUser("s11", "유저11");
        String accessToken = jwtProvider.issueAccessToken(user.getId());
        String sessionToken = startSession("game-water-sort");

        Thread.sleep(450);

        mockMvc.perform(post("/api/v1/games/game-water-sort/scores")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType("application/json")
                        .content(scoreBody(20, sessionToken)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.score").value(20))
                .andExpect(jsonPath("$.gameId").value("game-water-sort"));

        mockMvc.perform(get("/api/v1/games/game-water-sort/leaderboard"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.topScores[0].nickname").value("유저11"))
                .andExpect(jsonPath("$.topScores[0].score").value(20));
    }

    @Test
    void 신규_게임은_이동_횟수_0점_제출이_거부된다() throws Exception {
        // 121: game-sliding-puzzle은 minScore=1 — 0수 완성은 물리적으로 불가능한 값이라 거부돼야 한다.
        User user = saveUser("s12", "유저12");
        String accessToken = jwtProvider.issueAccessToken(user.getId());
        String sessionToken = startSession("game-sliding-puzzle"); // minDurationMs=400

        Thread.sleep(450);

        mockMvc.perform(post("/api/v1/games/game-sliding-puzzle/scores")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType("application/json")
                        .content(scoreBody(0, sessionToken)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("GAME_SCORE_IMPLAUSIBLE"));
    }

    @Test
    void limit을_99999로_요청해도_리더보드는_최대_100개까지만_반환한다() throws Exception {
        // 174: 서버가 limit 상한(100)을 강제해야 한다 — 클라이언트가 큰 값을 보내도 무한정 조회되면 안 됨.
        for (long userId = 1; userId <= 105; userId++) {
            submitDirectly("game-2048", userId, (int) userId, 1000);
        }

        mockMvc.perform(get("/api/v1/games/game-2048/leaderboard").param("limit", "99999"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.topScores.length()").value(100));
    }

    @Test
    void 정상적인_limit_10_요청은_10개_그대로_반환한다() throws Exception {
        // 174: 상한 로직이 정상 범위 요청까지 잘라먹지 않는지 확인 (패턴 B 회피 — 상한 초과/정상 두 시나리오 비교).
        for (long userId = 1; userId <= 15; userId++) {
            submitDirectly("game-2048", userId, (int) userId, 1000);
        }

        mockMvc.perform(get("/api/v1/games/game-2048/leaderboard").param("limit", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.topScores.length()").value(10));
    }

    private String startSession(String gameId) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/games/" + gameId + "/session"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        return json.get("sessionToken").asText();
    }

    private String scoreBody(int score, String sessionToken) throws Exception {
        return objectMapper.writeValueAsString(new java.util.HashMap<>() {{
            put("score", score);
            put("sessionToken", sessionToken);
        }});
    }

    private User saveUser(String providerId, String nickname) {
        return userRepository.save(new User(AuthProvider.GOOGLE, providerId, null, nickname));
    }

    private void submitDirectly(String gameId, Long userId, int score, int durationMs) {
        gameScoreRepository.save(new com.back.game.entity.GameScore(gameId, userId, score, durationMs));
    }
}
