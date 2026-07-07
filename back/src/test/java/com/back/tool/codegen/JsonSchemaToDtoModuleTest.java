package com.back.tool.codegen;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolResult;
import org.junit.jupiter.api.Test;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;
import java.util.zip.ZipFile;

import static org.assertj.core.api.Assertions.assertThat;

class JsonSchemaToDtoModuleTest {

    private static final Path SCHEMA = Paths.get(
            "src/test/resources/samples/user-schema.json");

    @Test
    void jsonSchemaProducesZipWithJavaFiles() throws Exception {
        JsonSchemaToDtoModule module = new JsonSchemaToDtoModule();
        ToolResult result = module.process(new ToolInput(List.of(SCHEMA), Map.of("packageName", "com.example")));

        assertThat(result.isFile()).isTrue();
        assertThat(result.outputFile()).exists();
        assertThat(result.outputFile().toString()).endsWith(".zip");
        try (ZipFile zip = new ZipFile(result.outputFile().toFile())) {
            assertThat(zip.size()).isGreaterThan(0);
            boolean hasJava = zip.stream().anyMatch(e -> e.getName().endsWith(".java"));
            assertThat(hasJava).isTrue();
        }
    }

    @Test
    void moduleMetadata() {
        JsonSchemaToDtoModule module = new JsonSchemaToDtoModule();
        assertThat(module.getId()).isEqualTo("json-schema-to-dto");
        assertThat(module.isHeavy()).isTrue();
        assertThat(module.getCategory()).isEqualTo("codegen");
    }
}
