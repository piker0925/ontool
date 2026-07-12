package com.back.tool.network;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class UrlParserModuleTest {

    private static final ObjectMapper JSON = new ObjectMapper();

    private Map<String, String> parseItems(ToolResult result) throws Exception {
        JsonNode root = JSON.readTree(result.textResult());
        assertThat(root.get("type").asText()).isEqualTo("keyvalue");
        Map<String, String> map = new LinkedHashMap<>();
        root.get("items").forEach(item -> map.put(item.get("key").asText(), item.get("value").asText()));
        return map;
    }

    @Test
    void parsesComplexUrlIntoExactKeyValueFields() throws Exception {
        UrlParserModule module = new UrlParserModule();
        ToolResult result = module.process(new ToolInput(
                List.of(), Map.of("url",
                "https://alice:s3cret@example.com:8443/path%20a/to?q=dev%20toolbox&lang=ko#section-2")
        ));

        assertThat(result.isFile()).isFalse();
        Map<String, String> items = parseItems(result);
        // 패턴 A: 각 필드를 독립 기준값과 정확 비교 — host/path 뒤바뀜, 쿼리 k/v 짝 오류를 잡는다.
        assertThat(items.get("스킴")).isEqualTo("https");
        assertThat(items.get("사용자명")).isEqualTo("alice");
        assertThat(items.get("비밀번호")).isEqualTo("s3cret");
        assertThat(items.get("호스트")).isEqualTo("example.com");
        assertThat(items.get("포트")).isEqualTo("8443");
        assertThat(items.get("경로")).isEqualTo("/path a/to");
        assertThat(items.get("경로 (원본)")).isEqualTo("/path%20a/to");
        assertThat(items.get("쿼리 · q")).isEqualTo("dev toolbox");
        assertThat(items.get("쿼리 · lang")).isEqualTo("ko");
        assertThat(items.get("프래그먼트")).isEqualTo("section-2");
    }

    @Test
    void userInfoWithoutPasswordHasNoPasswordRow() throws Exception {
        UrlParserModule module = new UrlParserModule();
        ToolResult result = module.process(new ToolInput(
                List.of(), Map.of("url", "https://bob@example.com/home")
        ));

        Map<String, String> items = parseItems(result);
        assertThat(items.get("사용자명")).isEqualTo("bob");
        assertThat(items).doesNotContainKey("비밀번호");
    }

    @Test
    void parsesSimpleUrlWithDefaults() throws Exception {
        UrlParserModule module = new UrlParserModule();
        ToolResult result = module.process(new ToolInput(
                List.of(), Map.of("url", "http://localhost/path")
        ));

        Map<String, String> items = parseItems(result);
        assertThat(items.get("스킴")).isEqualTo("http");
        assertThat(items.get("호스트")).isEqualTo("localhost");
        assertThat(items.get("포트")).isEqualTo("(기본)");
        assertThat(items.get("경로")).isEqualTo("/path");
        assertThat(items.get("프래그먼트")).isEqualTo("(없음)");
        // 인코딩된 문자가 없으면 원본 경로 행은 생략된다
        assertThat(items).doesNotContainKey("경로 (원본)");
        assertThat(items).doesNotContainKey("사용자명");
    }

    @Test
    void rejectsUrlWithoutSchemeOrHost() {
        UrlParserModule module = new UrlParserModule();
        assertThatThrownBy(() -> module.process(new ToolInput(List.of(), Map.of("url", "not a url"))))
                .isInstanceOf(ToolProcessingException.class);
        assertThatThrownBy(() -> module.process(new ToolInput(List.of(), Map.of("url", "example.com/path"))))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("유효하지 않은 URL");
    }

    @Test
    void rejectsBlankUrl() {
        UrlParserModule module = new UrlParserModule();
        assertThatThrownBy(() -> module.process(new ToolInput(List.of(), Map.of())))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("url");
    }

    @Test
    void moduleMetadata() {
        UrlParserModule module = new UrlParserModule();
        assertThat(module.getId()).isEqualTo("url-parser");
        assertThat(module.isHeavy()).isFalse();
    }
}
