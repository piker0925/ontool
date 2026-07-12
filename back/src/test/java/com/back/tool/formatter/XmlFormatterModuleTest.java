package com.back.tool.formatter;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class XmlFormatterModuleTest {

    private static final String COMPACT = "<root><child id=\"1\"><name>test</name></child></root>";

    private final XmlFormatterModule module = new XmlFormatterModule();

    private ToolResult run(Map<String, String> params) {
        return module.process(new ToolInput(List.of(), params));
    }

    @Test
    void formatsXmlWithDefaultTwoSpaceIndent() {
        ToolResult result = run(Map.of("xml", COMPACT, "minify", "false"));

        assertThat(result.isFile()).isFalse();
        // 정확한 2-space 들여쓰기 구조. minify 분기가 잘못 실행되면(단일 라인 출력) 실패한다.
        assertThat(result.textResult()).isEqualTo(
                "<root>\n  <child id=\"1\">\n    <name>test</name>\n  </child>\n</root>");
    }

    @Test
    void indentWidthFourChangesOnlyIndentation() {
        // 패턴 B: indentWidth=4는 들여쓰기 폭만 4칸으로 바뀌고 구조는 동일해야 한다.
        ToolResult result = run(Map.of("xml", COMPACT, "indentWidth", "4"));

        assertThat(result.textResult()).isEqualTo(
                "<root>\n    <child id=\"1\">\n        <name>test</name>\n    </child>\n</root>");
    }

    @Test
    void minifiesXml() {
        String formatted = "<root>\n  <child id=\"1\">\n    <name>test</name>\n  </child>\n</root>";
        ToolResult result = run(Map.of("xml", formatted, "minify", "true"));

        assertThat(result.isFile()).isFalse();
        // 완전 압축: 줄바꿈이 하나도 없어야 한다. indent 분기가 잘못 실행되면 실패한다.
        assertThat(result.textResult()).isEqualTo(
                "<root><child id=\"1\"><name>test</name></child></root>");
    }

    @Test
    void declarationOnPrependsXmlDeclaration() {
        // 패턴 B: declaration=true는 선언 한 줄이 앞에 붙고 본문은 동일해야 한다.
        ToolResult result = run(Map.of("xml", COMPACT, "declaration", "true"));

        assertThat(result.textResult()).isEqualTo(
                "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n"
                        + "<root>\n  <child id=\"1\">\n    <name>test</name>\n  </child>\n</root>");
    }

    @Test
    void declarationOffByDefault() {
        // 패턴 B 대비쌍: 기본값(declaration 미지정)은 선언 없이 본문만.
        ToolResult result = run(Map.of("xml", COMPACT));

        assertThat(result.textResult()).startsWith("<root>");
        assertThat(result.textResult()).doesNotContain("<?xml");
    }

    @Test
    void declarationWithMinifyStaysSingleLine() {
        ToolResult result = run(Map.of("xml", COMPACT, "minify", "true", "declaration", "true"));

        assertThat(result.textResult()).isEqualTo(
                "<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
                        + "<root><child id=\"1\"><name>test</name></child></root>");
    }

    @Test
    void invalidXmlThrows() {
        assertThatThrownBy(() -> run(Map.of("xml", "<root><unclosed>")))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("XML 처리 실패");
    }

    @Test
    void missingXmlThrows() {
        assertThatThrownBy(() -> run(Map.of()))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("xml");
    }

    @Test
    void invalidIndentWidthThrows() {
        assertThatThrownBy(() -> run(Map.of("xml", COMPACT, "indentWidth", "99")))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("indentWidth");
    }

    @Test
    void moduleMetadata() {
        assertThat(module.getId()).isEqualTo("xml-formatter");
        assertThat(module.isHeavy()).isFalse();
    }
}
