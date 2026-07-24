package com.back.tool.model;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ToolParamsTest {

    private ToolParams params(Map<String, String> raw) {
        return new ToolParams(raw);
    }

    @Test
    void getString_blankOrMissing_returnsDefault() {
        ToolParams p = params(Map.of("a", "  ", "b", "value"));

        assertThat(p.getString("a", "def")).isEqualTo("def");
        assertThat(p.getString("missing", "def")).isEqualTo("def");
        assertThat(p.getString("b", "def")).isEqualTo("value");
    }

    @Test
    void requireString_missing_throwsWithKeyInMessage() {
        assertThatThrownBy(() -> params(Map.of()).requireString("content"))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("'content'")
                .hasMessageContaining("필수");
    }

    @Test
    void getInt_parsesAndValidatesRange() {
        ToolParams p = params(Map.of("size", "300"));

        assertThat(p.getInt("size", 100, 1, 2000)).isEqualTo(300);
        assertThat(p.getInt("missing", 100, 1, 2000)).isEqualTo(100);
    }

    @Test
    void getInt_notANumber_throwsWithInputInMessage() {
        assertThatThrownBy(() -> params(Map.of("size", "abc")).getInt("size", 100, 1, 2000))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("'size'")
                .hasMessageContaining("abc");
    }

    @Test
    void getInt_outOfRange_throwsWithRangeInMessage() {
        assertThatThrownBy(() -> params(Map.of("size", "5000")).getInt("size", 100, 1, 2000))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("1~2000")
                .hasMessageContaining("5000");
    }

    @Test
    void getInt_belowMinimum_throws() {
        assertThatThrownBy(() -> params(Map.of("size", "0")).getInt("size", 100, 1, 2000))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("1~2000")
                .hasMessageContaining("0");
    }

    @Test
    void getInt_boundaryValues_areAccepted() {
        ToolParams p = params(Map.of("min", "1", "max", "2000"));

        assertThat(p.getInt("min", 100, 1, 2000)).isEqualTo(1);
        assertThat(p.getInt("max", 100, 1, 2000)).isEqualTo(2000);
    }

    @Test
    void getBool_parsesTrueFalseAndDefault() {
        ToolParams p = params(Map.of("on", "true", "off", "false"));

        assertThat(p.getBool("on", false)).isTrue();
        assertThat(p.getBool("off", true)).isFalse();
        assertThat(p.getBool("missing", true)).isTrue();
    }

    enum Mode {ENCRYPT, DECRYPT}

    @Test
    void getEnum_caseInsensitiveAndDefault() {
        ToolParams p = params(Map.of("mode", "decrypt"));

        assertThat(p.getEnum("mode", Mode.class, Mode.ENCRYPT)).isEqualTo(Mode.DECRYPT);
        assertThat(p.getEnum("missing", Mode.class, Mode.ENCRYPT)).isEqualTo(Mode.ENCRYPT);
    }

    @Test
    void getEnum_invalidValue_throws() {
        assertThatThrownBy(() -> params(Map.of("mode", "banana")).getEnum("mode", Mode.class, Mode.ENCRYPT))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("'mode'")
                .hasMessageContaining("banana");
    }

    @Test
    void getOptionalDouble_missingOrBlank_returnsNull() {
        ToolParams p = params(Map.of("blank", "  "));

        assertThat(p.getOptionalDouble("missing", 0, 100)).isNull();
        assertThat(p.getOptionalDouble("blank", 0, 100)).isNull();
    }

    @Test
    void getOptionalDouble_present_parsesAndValidatesRange() {
        ToolParams p = params(Map.of("x", "42.5"));

        assertThat(p.getOptionalDouble("x", 0, 100)).isEqualTo(42.5);
    }

    @Test
    void getOptionalDouble_outOfRange_throws() {
        assertThatThrownBy(() -> params(Map.of("x", "150")).getOptionalDouble("x", 0, 100))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("'x'")
                .hasMessageContaining("0.0~100.0");
    }
}
