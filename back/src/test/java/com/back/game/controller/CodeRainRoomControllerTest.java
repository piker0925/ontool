package com.back.game.controller;

import com.back.AbstractMySQLIntegrationTest;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("local")
@TestPropertySource(properties = {
        "storage.upload-dir=build/test-uploads",
        "scheduling.worker.delay=60000",
        "scheduling.ttl.delay=60000"
})
class CodeRainRoomControllerTest extends AbstractMySQLIntegrationTest {

    @Autowired
    WebApplicationContext wac;

    MockMvc mockMvc;
    ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setup() {
        mockMvc = MockMvcBuilders.webAppContextSetup(wac).apply(springSecurity()).build();
    }

    @Test
    void 코드레인_단어_선점_제출시_점수와_콤보수가_갱신된다() throws Exception {
        String code = createRoom("10.2.0.1");
        JsonNode host = joinAndGetJson(code, "10.2.0.1", "타자왕");
        startRoom(code, host);

        // 첫 번째 단어 뺏어치기 성공
        mockMvc.perform(post("/api/v1/games/game-code-rain-typing/rooms/" + code + "/claim-word")
                        .contentType("application/json")
                        .content(claimBody(host.get("participantId").asText(), host.get("roomSessionToken").asText(), 1, "java")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.participantId").value(host.get("participantId").asText()))
                .andExpect(jsonPath("$.nickname").value("타자왕"))
                .andExpect(jsonPath("$.wordId").value(1))
                .andExpect(jsonPath("$.wordText").value("java"))
                .andExpect(jsonPath("$.score").value(100))
                .andExpect(jsonPath("$.comboCount").value(1))
                .andExpect(jsonPath("$.attackTriggered").value(false));
    }

    @Test
    void 동일_플레이어가_3연속_단어_선점시_CRITICAL_BUG_공격이_발동한다() throws Exception {
        String code = createRoom("10.2.0.2");
        JsonNode host = joinAndGetJson(code, "10.2.0.2", "타자닌자");
        JsonNode guest = joinAndGetJson(code, "10.2.0.2", "상대방");
        startRoom(code, host);

        // 1회, 2회 단어 성공
        claimWord(code, host, 1, "spring");
        claimWord(code, host, 2, "kotlin");

        // 3회 단어 성공 -> attackTriggered = true & targetWord = "CRITICAL BUG!"
        mockMvc.perform(post("/api/v1/games/game-code-rain-typing/rooms/" + code + "/claim-word")
                        .contentType("application/json")
                        .content(claimBody(host.get("participantId").asText(), host.get("roomSessionToken").asText(), 3, "docker")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.comboCount").value(3))
                .andExpect(jsonPath("$.attackTriggered").value(true))
                .andExpect(jsonPath("$.attackWord").value("CRITICAL BUG!"));
    }

    private String createRoom(String clientIp) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/games/game-code-rain-typing/rooms")
                        .header("X-Real-IP", clientIp))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("code").asText();
    }

    private JsonNode joinAndGetJson(String code, String clientIp, String nickname) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/games/game-code-rain-typing/rooms/" + code + "/join")
                        .header("X-Real-IP", clientIp)
                        .contentType("application/json")
                        .content(joinBody(nickname)))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private void startRoom(String code, JsonNode host) throws Exception {
        mockMvc.perform(post("/api/v1/games/game-code-rain-typing/rooms/" + code + "/start")
                        .contentType("application/json")
                        .content(startBody(host.get("participantId").asText(), host.get("roomSessionToken").asText())))
                .andExpect(status().isOk());
    }

    private void claimWord(String code, JsonNode participant, long wordId, String text) throws Exception {
        mockMvc.perform(post("/api/v1/games/game-code-rain-typing/rooms/" + code + "/claim-word")
                        .contentType("application/json")
                        .content(claimBody(participant.get("participantId").asText(), participant.get("roomSessionToken").asText(), wordId, text)))
                .andExpect(status().isOk());
    }

    private String joinBody(String nickname) throws Exception {
        return objectMapper.writeValueAsString(java.util.Map.of("nickname", nickname));
    }

    private String startBody(String participantId, String roomSessionToken) throws Exception {
        return objectMapper.writeValueAsString(java.util.Map.of(
                "participantId", participantId,
                "roomSessionToken", roomSessionToken
        ));
    }

    private String claimBody(String participantId, String roomSessionToken, long wordId, String wordText) throws Exception {
        return objectMapper.writeValueAsString(java.util.Map.of(
                "participantId", participantId,
                "roomSessionToken", roomSessionToken,
                "wordId", wordId,
                "wordText", wordText
        ));
    }
}
