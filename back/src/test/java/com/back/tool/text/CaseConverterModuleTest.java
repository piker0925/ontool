package com.back.tool.text;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CaseConverterModuleTest {

    private final CaseConverterModule module = new CaseConverterModule();

    private String convert(String text, String from, String to) {
        ToolResult result = module.process(new ToolInput(
                List.of(), Map.of("text", text, "from", from, "to", to)
        ));
        assertThat(result.isFile()).isFalse();
        return result.textResult();
    }

    @Test
    void camelToSnake() {
        assertThat(convert("helloWorldFoo", "camel", "snake")).isEqualTo("hello_world_foo");
    }

    @Test
    void snakeToPascal() {
        assertThat(convert("hello_world_foo", "snake", "pascal")).isEqualTo("HelloWorldFoo");
    }

    @Test
    void camelToKebab() {
        assertThat(convert("helloWorldFoo", "camel", "kebab")).isEqualTo("hello-world-foo");
    }

    // ── 신규 형식: constant / dot / title ───────────────────────────────

    @Test
    void camelToConstant() {
        assertThat(convert("myVariableName", "camel", "constant")).isEqualTo("MY_VARIABLE_NAME");
    }

    @Test
    void constantToCamel() {
        assertThat(convert("MY_VARIABLE_NAME", "constant", "camel")).isEqualTo("myVariableName");
    }

    @Test
    void camelToDot() {
        assertThat(convert("myVariableName", "camel", "dot")).isEqualTo("my.variable.name");
    }

    @Test
    void dotToPascal() {
        assertThat(convert("my.variable.name", "dot", "pascal")).isEqualTo("MyVariableName");
    }

    @Test
    void snakeToTitle() {
        assertThat(convert("my_variable_name", "snake", "title")).isEqualTo("My Variable Name");
    }

    @Test
    void titleToKebab() {
        assertThat(convert("My Variable Name", "title", "kebab")).isEqualTo("my-variable-name");
    }

    // 같은 입력이라도 to 형식에 따라 서로 다른 정확한 출력이 나와야 한다
    // (snake→snake 는 소문자 유지, snake→constant 만 대문자)
    @Test
    void constantAndSnakeAreDistinct() {
        assertThat(convert("my_variable_name", "snake", "snake")).isEqualTo("my_variable_name");
        assertThat(convert("my_variable_name", "snake", "constant")).isEqualTo("MY_VARIABLE_NAME");
    }

    @Test
    void unsupportedFormatThrowsKoreanMessage() {
        assertThatThrownBy(() -> convert("abc", "camel", "unknown"))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("지원하지 않는 케이스 형식");
    }

    @Test
    void emptyTextReturnsEmpty() {
        assertThat(convert("", "camel", "constant")).isEqualTo("");
    }

    @Test
    void moduleMetadata() {
        assertThat(module.getId()).isEqualTo("case-converter");
        assertThat(module.isHeavy()).isFalse();
        assertThat(module.getCategory()).isEqualTo("text");
    }
}
