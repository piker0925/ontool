package com.back.tool.model;

import com.fasterxml.jackson.databind.ObjectMapper;

import java.nio.file.Path;
import java.util.List;
import java.util.Map;

public record ToolResult(Path outputFile, String textResult) {

    private static final ObjectMapper JSON = new ObjectMapper();

    public static ToolResult ofFile(Path path) {
        return new ToolResult(path, null);
    }

    public static ToolResult ofText(String text) {
        return new ToolResult(null, text);
    }

    /**
     * 구조화 결과 컨벤션: 프론트가 표/키값 등으로 렌더링할 수 있도록 JSON으로 직렬화한다.
     * payload는 최상위에 문자열 {@code type} 필드를 가져야 한다.
     * 표준 형태 — {"type":"table","columns":[...],"rows":[[...]]},
     * {"type":"keyvalue","items":[{"key":..,"value":..}]}. 도구 특화 type도 허용.
     */
    public static ToolResult ofJson(Object payload) {
        try {
            return new ToolResult(null, JSON.writeValueAsString(payload));
        } catch (Exception e) {
            throw new ToolProcessingException("결과 직렬화에 실패했습니다: " + e.getMessage(), e);
        }
    }

    /** {@code {"type":"keyvalue","items":[{"key":..,"value":..}]}} 컨벤션을 강제하는 헬퍼. */
    public static ToolResult ofKeyValue(List<Map<String, String>> items) {
        return ofJson(Map.of("type", "keyvalue", "items", items));
    }

    public boolean isFile() {
        return outputFile != null;
    }
}
