package com.back.tool.model;

import java.util.Map;

/**
 * 모듈 파라미터 파싱 공통 헬퍼.
 * 검증 실패 시 일관된 메시지의 {@link ToolProcessingException}을 던져
 * 프론트가 그대로 사용자에게 보여줄 수 있게 한다.
 */
public record ToolParams(Map<String, String> raw) {

    public static ToolParams of(ToolInput input) {
        return new ToolParams(input.params());
    }

    public String getString(String key, String defaultValue) {
        String v = raw.get(key);
        return (v == null || v.isBlank()) ? defaultValue : v;
    }

    public String requireString(String key) {
        String v = raw.get(key);
        if (v == null || v.isBlank()) {
            throw new ToolProcessingException("파라미터 '" + key + "'는 필수입니다.");
        }
        return v;
    }

    public int getInt(String key, int defaultValue, int min, int max) {
        String v = raw.get(key);
        if (v == null || v.isBlank()) return defaultValue;
        int parsed;
        try {
            parsed = Integer.parseInt(v.trim());
        } catch (NumberFormatException _) {
            throw new ToolProcessingException(
                    "파라미터 '" + key + "'는 정수여야 합니다. (입력값: " + v + ")");
        }
        if (parsed < min || parsed > max) {
            throw new ToolProcessingException(
                    "파라미터 '" + key + "'는 " + min + "~" + max + " 사이여야 합니다. (입력값: " + parsed + ")");
        }
        return parsed;
    }

    public boolean getBool(String key, boolean defaultValue) {
        String v = raw.get(key);
        if (v == null || v.isBlank()) return defaultValue;
        return Boolean.parseBoolean(v.trim());
    }

    public <E extends Enum<E>> E getEnum(String key, Class<E> type, E defaultValue) {
        String v = raw.get(key);
        if (v == null || v.isBlank()) return defaultValue;
        try {
            return Enum.valueOf(type, v.trim().toUpperCase());
        } catch (IllegalArgumentException _) {
            throw new ToolProcessingException(
                    "파라미터 '" + key + "'에 허용되지 않는 값입니다. (입력값: " + v + ")");
        }
    }
}
