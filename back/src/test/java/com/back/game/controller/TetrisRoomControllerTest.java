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
class TetrisRoomControllerTest extends AbstractMySQLIntegrationTest {

    @Autowired
    WebApplicationContext wac;

    MockMvc mockMvc;
    ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setup() {
        mockMvc = MockMvcBuilders.webAppContextSetup(wac).apply(springSecurity()).build();
    }

    @Test
    void 테트리스에서_2줄이상_삭제시_상대방에게_방해_블록이_전달된다() throws Exception {
        String code = createRoom("10.3.0.1");
        JsonNode host = joinAndGetJson(code, "10.3.0.1", "테트리스킹");
        JsonNode guest = joinAndGetJson(code, "10.3.0.1", "상대선수");
        startRoom(code, host);

        // 2줄 클리어 ➔ 1줄 방해 블록 공격 발동
        mockMvc.perform(post("/api/v1/games/game-tetris/rooms/" + code + "/clear-lines")
                        .contentType("application/json")
                        .content(clearBody(host.get("participantId").asText(), host.get("roomSessionToken").asText(), 2)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.attackerParticipantId").value(host.get("participantId").asText()))
                .andExpect(jsonPath("$.attackerNickname").value("테트리스킹"))
                .andExpect(jsonPath("$.garbageLinesAdded").value(1));
    }

    private String createRoom(String clientIp) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/games/game-tetris/rooms")
                        .header("X-Real-IP", clientIp))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("code").asText();
    }

    private JsonNode joinAndGetJson(String code, String clientIp, String nickname) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/games/game-tetris/rooms/" + code + "/join")
                        .header("X-Real-IP", clientIp)
                        .contentType("application/json")
                        .content(joinBody(nickname)))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private void startRoom(String code, JsonNode host) throws Exception {
        mockMvc.perform(post("/api/v1/games/game-tetris/rooms/" + code + "/start")
                        .contentType("application/json")
                        .content(startBody(host.get("participantId").asText(), host.get("roomSessionToken").asText())))
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

    private String clearBody(String participantId, String roomSessionToken, int clearedLineCount) throws Exception {
        return objectMapper.writeValueAsString(java.util.Map.of(
                "participantId", participantId,
                "roomSessionToken", roomSessionToken,
                "clearedLineCount", clearedLineCount
        ));
    }
}
