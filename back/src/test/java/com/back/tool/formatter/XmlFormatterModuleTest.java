package com.back.tool.formatter;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolResult;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class XmlFormatterModuleTest {

    private static final String COMPACT = "<root><child id=\"1\"><name>test</name></child></root>";

    @Test
    void formatsXmlWithIndent() {
        XmlFormatterModule module = new XmlFormatterModule();
        ToolResult result = module.process(new ToolInput(
                List.of(), Map.of("xml", COMPACT, "minify", "false")
        ));

        assertThat(result.isFile()).isFalse();
        assertThat(result.textResult()).contains("\n");
        assertThat(result.textResult()).contains("child");
    }

    @Test
    void minifiesXml() {
        String formatted = "<root>\n  <child>\n    <name>test</name>\n  </child>\n</root>";
        XmlFormatterModule module = new XmlFormatterModule();
        ToolResult result = module.process(new ToolInput(
                List.of(), Map.of("xml", formatted, "minify", "true")
        ));

        assertThat(result.isFile()).isFalse();
        assertThat(result.textResult()).doesNotContain("\n  ");
        assertThat(result.textResult()).contains("<name>test</name>");
    }

    @Test
    void moduleMetadata() {
        XmlFormatterModule module = new XmlFormatterModule();
        assertThat(module.getId()).isEqualTo("xml-formatter");
        assertThat(module.isHeavy()).isFalse();
    }
}
