package com.back.tool.converter;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolResult;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class CsvJsonModuleTest {

    @Test
    void csvToJson() {
        String csv = "name,age\nAlice,30\nBob,25";
        CsvJsonModule module = new CsvJsonModule();
        ToolResult result = module.process(new ToolInput(
                List.of(), Map.of("input", csv, "direction", "csv-to-json")
        ));

        assertThat(result.isFile()).isFalse();
        assertThat(result.textResult()).contains("\"name\"");
        assertThat(result.textResult()).contains("\"Alice\"");
        assertThat(result.textResult()).contains("\"Bob\"");
    }

    @Test
    void jsonToCsv() {
        String json = "[{\"name\":\"Alice\",\"age\":30},{\"name\":\"Bob\",\"age\":25}]";
        CsvJsonModule module = new CsvJsonModule();
        ToolResult result = module.process(new ToolInput(
                List.of(), Map.of("input", json, "direction", "json-to-csv")
        ));

        assertThat(result.isFile()).isFalse();
        assertThat(result.textResult()).contains("Alice");
        assertThat(result.textResult()).contains("Bob");
        assertThat(result.textResult()).contains(",");
    }

    @Test
    void moduleMetadata() {
        CsvJsonModule module = new CsvJsonModule();
        assertThat(module.getId()).isEqualTo("csv-json");
        assertThat(module.isHeavy()).isFalse();
    }
}
