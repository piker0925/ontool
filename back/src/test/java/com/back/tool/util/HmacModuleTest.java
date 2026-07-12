package com.back.tool.util;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class HmacModuleTest {

    private final HmacModule module = new HmacModule();

    private ToolResult run(Map<String, String> params) {
        return module.process(new ToolInput(List.of(), params));
    }

    @Test
    void producesKnownHmacSha256() {
        ToolResult result = run(Map.of("text", "hello", "key", "secret", "algorithm", "HmacSHA256"));

        assertThat(result.isFile()).isFalse();
        // HMAC-SHA256("hello", "secret") known value
        assertThat(result.textResult()).isEqualToIgnoringCase(
                "88aab3ede8d3adf94d26ab90d3bafd4a2083070c3bcce9c014ee04a443847c0b");
    }

    @Test
    void producesKnownHmacSha512() {
        ToolResult result = run(Map.of("text", "hello", "key", "secret", "algorithm", "HmacSHA512"));

        // algorithm 파라미터를 무시하고 항상 SHA256으로 고정하는 뮤턴트를 잡는다.
        // HMAC-SHA512("hello", "secret") known value (독립 계산)
        assertThat(result.textResult()).isEqualToIgnoringCase(
                "db1595ae88a62fd151ec1cba81b98c39df82daae7b4cb9820f446d5bf02f1dcf"
                        + "ca6683d88cab3e273f5963ab8ec469a746b5b19086371239f67d1e5f99a79440");
    }

    @Test
    void producesKnownHmacSha1() {
        ToolResult result = run(Map.of("text", "hello", "key", "secret", "algorithm", "HmacSHA1"));

        // HMAC-SHA1("hello", "secret") — Python hmac 모듈로 독립 계산한 값
        assertThat(result.textResult()).isEqualToIgnoringCase(
                "5112055c05f944f85755efc5cd8970e194e9f45b");
    }

    @Test
    void base64FormatEncodesSameMacDifferently() {
        // format=base64 → 같은 MAC 바이트의 Base64 인코딩 (독립 계산값)
        ToolResult b64 = run(Map.of(
                "text", "hello", "key", "secret", "algorithm", "HmacSHA256", "format", "base64"));
        assertThat(b64.textResult()).isEqualTo("iKqz7ejTrflNJquQ07r9SiCDBww7zOnAFO4EpEOEfAs=");

        // format=hex(기본) → hex 문자열 (format 파라미터 무시 뮤턴트를 잡는다)
        ToolResult hex = run(Map.of(
                "text", "hello", "key", "secret", "algorithm", "HmacSHA256", "format", "hex"));
        assertThat(hex.textResult()).isEqualTo(
                "88aab3ede8d3adf94d26ab90d3bafd4a2083070c3bcce9c014ee04a443847c0b");
    }

    @Test
    void keyFormatDecodesBinaryKeys() {
        // hex 키: 0x00112233...eeff 바이너리 키 — utf8로 취급하면 다른 값이 나온다 (독립 계산값)
        ToolResult hexKey = run(Map.of(
                "text", "hello", "key", "00112233445566778899aabbccddeeff",
                "algorithm", "HmacSHA256", "keyFormat", "hex"));
        assertThat(hexKey.textResult()).isEqualTo(
                "25583405b35bd64a6f8d0829c676a3b72db067eb80edf3dba3a405d66dc7a94e");

        // base64 키: "c2VjcmV0" == "secret" → utf8 "secret" 키와 같은 MAC이어야 한다
        ToolResult b64Key = run(Map.of(
                "text", "hello", "key", "c2VjcmV0",
                "algorithm", "HmacSHA256", "keyFormat", "base64"));
        assertThat(b64Key.textResult()).isEqualTo(
                "88aab3ede8d3adf94d26ab90d3bafd4a2083070c3bcce9c014ee04a443847c0b");
    }

    @Test
    void rejectsInvalidInputs() {
        assertThatThrownBy(() -> run(Map.of("text", "hello", "key", "secret", "algorithm", "HmacSHA3-999")))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("지원하지 않는 알고리즘");

        assertThatThrownBy(() -> run(Map.of("text", "hello", "key", "zz-not-hex", "keyFormat", "hex")))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("Hex 형식");

        assertThatThrownBy(() -> run(Map.of("text", "hello", "key", "")))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("서명 키");
    }

    @Test
    void moduleMetadata() {
        assertThat(module.getId()).isEqualTo("hmac");
        assertThat(module.isHeavy()).isFalse();
    }
}
