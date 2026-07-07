package com.back.tool.converter;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolResult;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class JsonTomlModuleTest {

    @Test
    void jsonToToml() {
        JsonTomlModule module = new JsonTomlModule();
        ToolResult result = module.process(new ToolInput(
                List.of(), Map.of("input", "{\"name\":\"Alice\",\"age\":30}", "direction", "json-to-toml")
        ));

        assertThat(result.isFile()).isFalse();
        assertThat(result.textResult()).contains("name");
        assertThat(result.textResult()).contains("Alice");
    }

    @Test
    void tomlToJson() {
        JsonTomlModule module = new JsonTomlModule();
        ToolResult result = module.process(new ToolInput(
                List.of(), Map.of("input", "name = \"Alice\"\nage = 30", "direction", "toml-to-json")
        ));

        assertThat(result.isFile()).isFalse();
        assertThat(result.textResult()).contains("\"name\"");
        assertThat(result.textResult()).contains("\"Alice\"");
        assertThat(result.textResult()).contains("30");
    }

    @Test
    void moduleMetadata() {
        JsonTomlModule module = new JsonTomlModule();
        assertThat(module.getId()).isEqualTo("json-toml");
        assertThat(module.isHeavy()).isFalse();
    }
}
