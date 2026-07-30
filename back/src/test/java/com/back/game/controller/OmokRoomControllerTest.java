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
class OmokRoomControllerTest extends AbstractMySQLIntegrationTest {

    @Autowired
    WebApplicationContext wac;

    MockMvc mockMvc;
    ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setup() {
        mockMvc = MockMvcBuilders.webAppContextSetup(wac).apply(springSecurity()).build();
    }

    @Test
    void 오목에서_턴에_맞게_돌을_두면_다음_턴_정보와_착수_좌표가_반환된다() throws Exception {
        String code = createRoom("10.4.0.1");
        JsonNode host = joinAndGetJson(code, "10.4.0.1", "흑돌선수");
        JsonNode guest = joinAndGetJson(code, "10.4.0.1", "백돌선수");
        startRoom(code, host);

        // 첫 번째 턴 (흑돌: host) (7, 7) 착수
        mockMvc.perform(post("/api/v1/games/game-omok/rooms/" + code + "/place-stone")
                        .contentType("application/json")
                        .content(placeBody(host.get("participantId").asText(), host.get("roomSessionToken").asText(), 7, 7)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.participantId").value(host.get("participantId").asText()))
                .andExpect(jsonPath("$.x").value(7))
                .andExpect(jsonPath("$.y").value(7))
                .andExpect(jsonPath("$.nextTurnParticipantId").value(guest.get("participantId").asText()))
                .andExpect(jsonPath("$.winnerParticipantId").isEmpty());
    }

    private String createRoom(String clientIp) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/games/game-omok/rooms")
                        .header("X-Real-IP", clientIp))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("code").asText();
    }

    private JsonNode joinAndGetJson(String code, String clientIp, String nickname) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/games/game-omok/rooms/" + code + "/join")
                        .header("X-Real-IP", clientIp)
                        .contentType("application/json")
                        .content(joinBody(nickname)))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private void startRoom(String code, JsonNode host) throws Exception {
        mockMvc.perform(post("/api/v1/games/game-omok/rooms/" + code + "/start")
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

    private String placeBody(String participantId, String roomSessionToken, int x, int y) throws Exception {
        return objectMapper.writeValueAsString(java.util.Map.of(
                "participantId", participantId,
                "roomSessionToken", roomSessionToken,
                "x", x,
                "y", y
        ));
    }
}
