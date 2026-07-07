package com.back.tool.converter;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolResult;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class JsonXmlModuleTest {

    @Test
    void jsonToXml() {
        JsonXmlModule module = new JsonXmlModule();
        ToolResult result = module.process(new ToolInput(
                List.of(), Map.of("input", "{\"name\":\"Alice\",\"age\":30}", "direction", "json-to-xml")
        ));

        assertThat(result.isFile()).isFalse();
        assertThat(result.textResult()).contains("<name>Alice</name>");
        assertThat(result.textResult()).contains("<age>30</age>");
    }

    @Test
    void xmlToJson() {
        JsonXmlModule module = new JsonXmlModule();
        ToolResult result = module.process(new ToolInput(
                List.of(), Map.of("input", "<root><name>Alice</name><age>30</age></root>", "direction", "xml-to-json")
        ));

        assertThat(result.isFile()).isFalse();
        assertThat(result.textResult()).contains("\"name\"");
        assertThat(result.textResult()).contains("\"Alice\"");
    }

    @Test
    void moduleMetadata() {
        JsonXmlModule module = new JsonXmlModule();
        assertThat(module.getId()).isEqualTo("json-xml");
        assertThat(module.isHeavy()).isFalse();
    }
}
