package com.back.tool.converter;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolResult;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class JsonYamlModuleTest {

    @Test
    void jsonToYaml() {
        JsonYamlModule module = new JsonYamlModule();
        ToolResult result = module.process(new ToolInput(
                List.of(), Map.of("input", "{\"name\":\"Alice\",\"age\":30}", "direction", "json-to-yaml")
        ));

        assertThat(result.isFile()).isFalse();
        assertThat(result.textResult()).contains("name: Alice");
        assertThat(result.textResult()).contains("age: 30");
    }

    @Test
    void yamlToJson() {
        JsonYamlModule module = new JsonYamlModule();
        ToolResult result = module.process(new ToolInput(
                List.of(), Map.of("input", "name: Alice\nage: 30", "direction", "yaml-to-json")
        ));

        assertThat(result.isFile()).isFalse();
        assertThat(result.textResult()).contains("\"name\"");
        assertThat(result.textResult()).contains("\"Alice\"");
    }

    @Test
    void moduleMetadata() {
        JsonYamlModule module = new JsonYamlModule();
        assertThat(module.getId()).isEqualTo("json-yaml");
        assertThat(module.isHeavy()).isFalse();
        assertThat(module.getCategory()).isEqualTo("converter");
    }
}
