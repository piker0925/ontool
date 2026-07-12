package com.back.tool.security;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class BcryptModuleTest {

    private static final ObjectMapper JSON = new ObjectMapper();

    private final BcryptModule module = new BcryptModule();

    /** keyvalue 결과에서 지정한 key의 value를 꺼낸다. 없으면 테스트 실패. */
    private static String itemValue(ToolResult result, String key) throws Exception {
        JsonNode root = JSON.readTree(result.textResult());
        assertThat(root.path("type").asText()).isEqualTo("keyvalue");
        for (JsonNode item : root.path("items")) {
            if (item.path("key").asText().equals(key)) return item.path("value").asText();
        }
        throw new AssertionError("keyvalue 결과에 '" + key + "' 항목이 없습니다: " + result.textResult());
    }

    @Test
    void hashMatchesOriginalPassword() throws Exception {
        ToolResult result = module.process(new ToolInput(
                List.of(), Map.of("password", "secret123", "rounds", "4")
        ));

        assertThat(result.isFile()).isFalse();
        String hash = itemValue(result, "해시");
        // 비용 factor가 요청한 rounds(4)를 반영해야 한다 — 기본값(10) 고정이면 이 assert가 실패한다.
        assertThat(hash).startsWith("$2a$04$");
        assertThat(new BCryptPasswordEncoder().matches("secret123", hash)).isTrue();
        assertThat(new BCryptPasswordEncoder().matches("wrong", hash)).isFalse();
        assertThat(itemValue(result, "강도 (rounds)")).isEqualTo("4 — ⚠️ 약함 (테스트 용도)");
    }

    @Test
    void roundsParamControlsCostFactor() throws Exception {
        ToolResult result = module.process(new ToolInput(
                List.of(), Map.of("password", "secret123", "rounds", "6")
        ));

        // rounds가 다르면 비용 factor도 달라져야 한다 — 파라미터 무시 뮤턴트를 잡는다.
        String hash = itemValue(result, "해시");
        assertThat(hash).startsWith("$2a$06$");
        assertThat(new BCryptPasswordEncoder().matches("secret123", hash)).isTrue();
    }

    @Test
    void roundsOutOfRangeRejected() {
        assertThatThrownBy(() -> module.process(new ToolInput(
                List.of(), Map.of("password", "secret123", "rounds", "3")
        )))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("rounds")
                .hasMessageContaining("4~31");
    }

    @Test
    void passwordOver72BytesRejected() {
        String longPassword = "a".repeat(73);
        assertThatThrownBy(() -> module.process(new ToolInput(
                List.of(), Map.of("password", longPassword)
        )))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("72바이트")
                .hasMessageContaining("73바이트");
    }

    // ---- verify 모드 ----
    // 패턴 B: 맞는 조합(일치)과 틀린 조합(불일치)을 모두 검증해
    // "항상 일치" / "항상 불일치" 뮤턴트를 구분한다.

    @Test
    void verifyReportsMatchForCorrectPair() throws Exception {
        String hash = new BCryptPasswordEncoder(4).encode("secret123");

        ToolResult result = module.process(new ToolInput(
                List.of(), Map.of("mode", "verify", "password", "secret123", "hash", hash)
        ));

        assertThat(itemValue(result, "검증 결과")).isEqualTo("✓ 일치");
        assertThat(itemValue(result, "해시 강도 (rounds)")).startsWith("4 — ");
    }

    @Test
    void verifyReportsMismatchForWrongPassword() throws Exception {
        String hash = new BCryptPasswordEncoder(4).encode("secret123");

        ToolResult result = module.process(new ToolInput(
                List.of(), Map.of("mode", "verify", "password", "totally-wrong", "hash", hash)
        ));

        assertThat(itemValue(result, "검증 결과")).isEqualTo("✗ 불일치");
    }

    @Test
    void verifyRejectsInvalidHashFormat() {
        assertThatThrownBy(() -> module.process(new ToolInput(
                List.of(), Map.of("mode", "verify", "password", "secret123", "hash", "not-a-bcrypt-hash")
        )))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("$2a$");
    }

    @Test
    void verifyRequiresHashParam() {
        assertThatThrownBy(() -> module.process(new ToolInput(
                List.of(), Map.of("mode", "verify", "password", "secret123")
        )))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("hash");
    }

    @Test
    void unknownModeRejected() {
        assertThatThrownBy(() -> module.process(new ToolInput(
                List.of(), Map.of("mode", "generate", "password", "secret123")
        )))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("mode");
    }

    @Test
    void moduleMetadata() {
        assertThat(module.getId()).isEqualTo("bcrypt");
        assertThat(module.isHeavy()).isFalse();
        assertThat(module.getCategory()).isEqualTo("security");
    }
}
