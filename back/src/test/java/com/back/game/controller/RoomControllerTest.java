package com.back.game.controller;

import com.back.AbstractMySQLIntegrationTest;
import com.back.game.repository.RoomWinRepository;
import com.back.game.service.RoomRegistry;
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

import static org.assertj.core.api.Assertions.assertThat;
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
        "ratelimit.room-create.max-per-window=2",
        "ratelimit.room-create.window-seconds=60"
})
class RoomControllerTest extends AbstractMySQLIntegrationTest {

    @Autowired
    WebApplicationContext wac;
    @Autowired
    UserRepository userRepository;
    @Autowired
    JwtProvider jwtProvider;
    @Autowired
    RoomWinRepository roomWinRepository;

    MockMvc mockMvc;
    ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setup() {
        userRepository.deleteAll();
        roomWinRepository.deleteAll();
        mockMvc = MockMvcBuilders.webAppContextSetup(wac).apply(springSecurity()).build();
    }

    @Test
    void 방을_생성하면_4자리_코드를_받는다() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/games/game-reaction-time/rooms")
                        .header("X-Real-IP", "10.1.0.1"))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        assertThat(json.get("code").asText()).matches("\\d{4}");
    }

    @Test
    void 게스트로_입장하면_제출한_닉네임과_함께_참가자_목록에_추가되고_방_세션_토큰을_받는다() throws Exception {
        String code = createRoom("10.1.0.2");

        MvcResult result = mockMvc.perform(post("/api/v1/games/game-reaction-time/rooms/" + code + "/join")
                        .contentType("application/json")
                        .content(joinBody("행복한 너구리")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").value(code))
                .andExpect(jsonPath("$.nickname").value("행복한 너구리"))
                .andExpect(jsonPath("$.participants.length()").value(1))
                .andExpect(jsonPath("$.participants[0].nickname").value("행복한 너구리"))
                .andReturn();

        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        assertThat(json.get("roomSessionToken").asText()).isNotBlank();
        assertThat(json.get("participantId").asText()).isNotBlank();
    }

    @Test
    void 로그인_유저는_제출한_닉네임_대신_실제_계정_닉네임으로_입장한다() throws Exception {
        User user = userRepository.save(new User(AuthProvider.GOOGLE, "u1", null, "실제닉네임"));
        String accessToken = jwtProvider.issueAccessToken(user.getId());
        String code = createRoom("10.1.0.3");

        mockMvc.perform(post("/api/v1/games/game-reaction-time/rooms/" + code + "/join")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType("application/json")
                        .content(joinBody("위장하려는닉네임")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.nickname").value("실제닉네임"));
    }

    @Test
    void 존재하지_않는_코드로_입장하면_404() throws Exception {
        mockMvc.perform(post("/api/v1/games/game-reaction-time/rooms/0000/join")
                        .contentType("application/json")
                        .content(joinBody("아무개")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("ROOM_NOT_FOUND"));
    }

    @Test
    void 같은_IP의_방_생성_빈도_상한을_넘으면_429() throws Exception {
        // max-per-window=2로 낮춰 테스트 (기존 game-score 레이트리밋 테스트와 동일한 방식).
        // 다른 테스트 메서드들과 카운터를 공유하지 않도록 이 테스트만의 고유 IP를 지정한다 — 실제
        // 운영에서는 nginx가 X-Real-IP를 덮어쓰므로 클라이언트가 조작할 수 없지만(ClientIpResolver),
        // 테스트에서는 격리 목적으로 직접 헤더를 지정한다.
        String uniqueTestIp = "10.99.0.1";
        mockMvc.perform(post("/api/v1/games/game-reaction-time/rooms").header("X-Real-IP", uniqueTestIp))
                .andExpect(status().isCreated());
        mockMvc.perform(post("/api/v1/games/game-reaction-time/rooms").header("X-Real-IP", uniqueTestIp))
                .andExpect(status().isCreated());
        mockMvc.perform(post("/api/v1/games/game-reaction-time/rooms").header("X-Real-IP", uniqueTestIp))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("RATE_LIMITED"));
    }

    @Test
    void 방장이_유효한_토큰으로_시작하면_200() throws Exception {
        String code = createRoom("10.1.0.4");
        JsonNode host = joinAndGetJson(code, "10.1.0.4", "방장");

        mockMvc.perform(post("/api/v1/games/game-reaction-time/rooms/" + code + "/start")
                        .contentType("application/json")
                        .content(startBody(host.get("participantId").asText(), host.get("roomSessionToken").asText())))
                .andExpect(status().isOk());
    }

    @Test
    void 방장이_아닌_참가자가_시작하면_403() throws Exception {
        String code = createRoom("10.1.0.5");
        joinAndGetJson(code, "10.1.0.5", "방장");
        JsonNode guest = joinAndGetJson(code, "10.1.0.5", "게스트");

        mockMvc.perform(post("/api/v1/games/game-reaction-time/rooms/" + code + "/start")
                        .contentType("application/json")
                        .content(startBody(guest.get("participantId").asText(), guest.get("roomSessionToken").asText())))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ROOM_NOT_HOST"));
    }

    @Test
    void 유효하지_않은_토큰으로_시작하면_400() throws Exception {
        String code = createRoom("10.1.0.6");
        JsonNode host = joinAndGetJson(code, "10.1.0.6", "방장");

        mockMvc.perform(post("/api/v1/games/game-reaction-time/rooms/" + code + "/start")
                        .contentType("application/json")
                        .content(startBody(host.get("participantId").asText(), "garbage-token")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("GAME_SESSION_INVALID"));
    }

    @Test
    void 이미_시작된_방에_새로_입장하면_409() throws Exception {
        String code = createRoom("10.1.0.7");
        JsonNode host = joinAndGetJson(code, "10.1.0.7", "방장");
        mockMvc.perform(post("/api/v1/games/game-reaction-time/rooms/" + code + "/start")
                        .contentType("application/json")
                        .content(startBody(host.get("participantId").asText(), host.get("roomSessionToken").asText())))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/games/game-reaction-time/rooms/" + code + "/join")
                        .contentType("application/json")
                        .content(joinBody("지각생")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ROOM_ALREADY_STARTED"));
    }

    @Test
    void 유효한_토큰으로_클릭하면_순위_결과를_받는다() throws Exception {
        String code = createRoom("10.1.0.8");
        JsonNode host = joinAndGetJson(code, "10.1.0.8", "방장");
        startRoom(code, host);

        mockMvc.perform(post("/api/v1/games/game-reaction-time/rooms/" + code + "/click")
                        .contentType("application/json")
                        .content(startBody(host.get("participantId").asText(), host.get("roomSessionToken").asText())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].participantId").value(host.get("participantId").asText()))
                .andExpect(jsonPath("$[0].rank").value(1))
                .andExpect(jsonPath("$[0].falseStart").value(false));
    }

    @Test
    void 두_참가자가_순서대로_클릭하면_도착_순서대로_순위가_매겨진다() throws Exception {
        String code = createRoom("10.1.0.9");
        JsonNode host = joinAndGetJson(code, "10.1.0.9", "방장");
        JsonNode guest = joinAndGetJson(code, "10.1.0.9", "게스트");
        startRoom(code, host);

        // 게스트가 먼저 클릭 → 1등이어야 한다(먼저 도착).
        mockMvc.perform(post("/api/v1/games/game-reaction-time/rooms/" + code + "/click")
                        .contentType("application/json")
                        .content(startBody(guest.get("participantId").asText(), guest.get("roomSessionToken").asText())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].participantId").value(guest.get("participantId").asText()));

        MvcResult second = mockMvc.perform(post("/api/v1/games/game-reaction-time/rooms/" + code + "/click")
                        .contentType("application/json")
                        .content(startBody(host.get("participantId").asText(), host.get("roomSessionToken").asText())))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode results = objectMapper.readTree(second.getResponse().getContentAsString());
        assertThat(results.get(0).get("participantId").asText()).isEqualTo(guest.get("participantId").asText());
        assertThat(results.get(1).get("participantId").asText()).isEqualTo(host.get("participantId").asText());
    }

    @Test
    void 무효한_토큰으로_클릭하면_400() throws Exception {
        String code = createRoom("10.1.0.10");
        JsonNode host = joinAndGetJson(code, "10.1.0.10", "방장");
        startRoom(code, host);

        mockMvc.perform(post("/api/v1/games/game-reaction-time/rooms/" + code + "/click")
                        .contentType("application/json")
                        .content(startBody(host.get("participantId").asText(), "garbage-token")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("GAME_SESSION_INVALID"));
    }

    @Test
    void 시작되지_않은_방에서_클릭하면_409() throws Exception {
        String code = createRoom("10.1.0.11");
        JsonNode host = joinAndGetJson(code, "10.1.0.11", "방장");

        mockMvc.perform(post("/api/v1/games/game-reaction-time/rooms/" + code + "/click")
                        .contentType("application/json")
                        .content(startBody(host.get("participantId").asText(), host.get("roomSessionToken").asText())))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ROOM_NOT_STARTED"));
    }

    @Test
    void 로그인한_우승자는_전원_클릭_완료_시_승리_기록이_저장된다() throws Exception {
        User user = userRepository.save(new User(AuthProvider.GOOGLE, "win1", null, "우승자"));
        String accessToken = jwtProvider.issueAccessToken(user.getId());
        String code = createRoom("10.1.0.12");
        JsonNode host = joinLoggedInAndGetJson(code, accessToken);
        JsonNode guest = joinAndGetJson(code, "10.1.0.12", "게스트");
        startRoom(code, host);

        // 방장(로그인 유저)이 먼저 클릭 → 1등.
        mockMvc.perform(post("/api/v1/games/game-reaction-time/rooms/" + code + "/click")
                        .contentType("application/json")
                        .content(startBody(host.get("participantId").asText(), host.get("roomSessionToken").asText())))
                .andExpect(status().isOk());
        assertThat(roomWinRepository.count()).isZero(); // 아직 전원 클릭 전

        mockMvc.perform(post("/api/v1/games/game-reaction-time/rooms/" + code + "/click")
                        .contentType("application/json")
                        .content(startBody(guest.get("participantId").asText(), guest.get("roomSessionToken").asText())))
                .andExpect(status().isOk());

        assertThat(roomWinRepository.count()).isEqualTo(1);
        assertThat(roomWinRepository.findAll().get(0).getUserId()).isEqualTo(user.getId());
    }

    @Test
    void 비로그인_우승자는_전원_클릭_완료돼도_승리_기록이_저장되지_않는다() throws Exception {
        String code = createRoom("10.1.0.13");
        JsonNode host = joinAndGetJson(code, "10.1.0.13", "방장"); // 게스트
        JsonNode guest = joinAndGetJson(code, "10.1.0.13", "게스트2");
        startRoom(code, host);

        mockMvc.perform(post("/api/v1/games/game-reaction-time/rooms/" + code + "/click")
                        .contentType("application/json")
                        .content(startBody(host.get("participantId").asText(), host.get("roomSessionToken").asText())))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/games/game-reaction-time/rooms/" + code + "/click")
                        .contentType("application/json")
                        .content(startBody(guest.get("participantId").asText(), guest.get("roomSessionToken").asText())))
                .andExpect(status().isOk());

        assertThat(roomWinRepository.count()).isZero();
    }

    @Test
    void 방장이_다음_라운드를_트리거하면_200이고_클릭_기록이_초기화된다() throws Exception {
        String code = createRoom("10.1.0.14");
        JsonNode host = joinAndGetJson(code, "10.1.0.14", "방장");
        startRoom(code, host);
        mockMvc.perform(post("/api/v1/games/game-reaction-time/rooms/" + code + "/click")
                        .contentType("application/json")
                        .content(startBody(host.get("participantId").asText(), host.get("roomSessionToken").asText())))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/games/game-reaction-time/rooms/" + code + "/next-round")
                        .contentType("application/json")
                        .content(startBody(host.get("participantId").asText(), host.get("roomSessionToken").asText())))
                .andExpect(status().isOk());

        // 초기화됐는지 확인 — 다시 클릭하면(예전 클릭이 남아있지 않으므로) 여전히 1등으로 판정된다.
        mockMvc.perform(post("/api/v1/games/game-reaction-time/rooms/" + code + "/click")
                        .contentType("application/json")
                        .content(startBody(host.get("participantId").asText(), host.get("roomSessionToken").asText())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].rank").value(1));
    }

    @Test
    void 방장이_아닌_참가자가_다음_라운드를_트리거하면_403() throws Exception {
        String code = createRoom("10.1.0.15");
        JsonNode host = joinAndGetJson(code, "10.1.0.15", "방장");
        JsonNode guest = joinAndGetJson(code, "10.1.0.15", "게스트");
        startRoom(code, host);

        mockMvc.perform(post("/api/v1/games/game-reaction-time/rooms/" + code + "/next-round")
                        .contentType("application/json")
                        .content(startBody(guest.get("participantId").asText(), guest.get("roomSessionToken").asText())))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ROOM_NOT_HOST"));
    }

    @Test
    void 아직_시작하지_않은_방에서_다음_라운드를_트리거하면_409() throws Exception {
        String code = createRoom("10.1.0.16");
        JsonNode host = joinAndGetJson(code, "10.1.0.16", "방장");

        mockMvc.perform(post("/api/v1/games/game-reaction-time/rooms/" + code + "/next-round")
                        .contentType("application/json")
                        .content(startBody(host.get("participantId").asText(), host.get("roomSessionToken").asText())))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ROOM_NOT_STARTED"));
    }

    @Test
    void 방_목록을_조회하면_대기중인_방이_인원수와_함께_보인다() throws Exception {
        String code = createRoom("10.2.0.1");
        joinAndGetJson(code, "10.2.0.1", "방장");

        mockMvc.perform(get("/api/v1/games/game-reaction-time/rooms"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.code == '" + code + "')].participantCount").value(1))
                .andExpect(jsonPath("$[?(@.code == '" + code + "')].maxParticipants").value(8));
    }

    @Test
    void 다른_게임_경로로_조회하면_그_게임의_방만_보인다() throws Exception {
        String reactionCode = createRoom("10.2.0.2");
        MvcResult omokResult = mockMvc.perform(post("/api/v1/games/game-omok/rooms")
                        .header("X-Real-IP", "10.2.0.3"))
                .andExpect(status().isCreated())
                .andReturn();
        String omokCode = objectMapper.readTree(omokResult.getResponse().getContentAsString()).get("code").asText();

        mockMvc.perform(get("/api/v1/games/game-reaction-time/rooms"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.code == '" + reactionCode + "')]").exists())
                .andExpect(jsonPath("$[?(@.code == '" + omokCode + "')]").doesNotExist());
    }

    @Autowired
    RoomRegistry roomRegistry;

    private void startRoom(String code, JsonNode host) throws Exception {
        mockMvc.perform(post("/api/v1/games/game-reaction-time/rooms/" + code + "/start")
                        .contentType("application/json")
                        .content(startBody(host.get("participantId").asText(), host.get("roomSessionToken").asText())))
                .andExpect(status().isOk());
        roomRegistry.overrideGoAtForTest(code, java.time.Instant.now().minusSeconds(1));
    }

    private JsonNode joinLoggedInAndGetJson(String code, String accessToken) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/games/game-reaction-time/rooms/" + code + "/join")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private JsonNode joinAndGetJson(String code, String clientIp, String nickname) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/games/game-reaction-time/rooms/" + code + "/join")
                        .header("X-Real-IP", clientIp)
                        .contentType("application/json")
                        .content(joinBody(nickname)))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private String startBody(String participantId, String roomSessionToken) throws Exception {
        return objectMapper.writeValueAsString(new java.util.HashMap<>() {{
            put("participantId", participantId);
            put("roomSessionToken", roomSessionToken);
        }});
    }

    // 레이트리밋 카운터가 IP 기준(전역, 유저 무관)이라 테스트마다 고유 IP를 지정해 서로 카운트가
    // 섞이지 않게 격리한다 — 안 그러면 max-per-window=2로 낮춘 이 테스트 클래스 안에서 다른
    // 테스트의 방 생성 호출과 카운트가 합산돼 예측 불가능하게 429가 나거나 안 나거나 하게 된다.
    private String createRoom(String clientIp) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/games/game-reaction-time/rooms")
                        .header("X-Real-IP", clientIp))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("code").asText();
    }

    private String joinBody(String nickname) throws Exception {
        return objectMapper.writeValueAsString(new java.util.HashMap<>() {{
            put("nickname", nickname);
        }});
    }
}
