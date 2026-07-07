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

class OpenApiToCodeModuleTest {

    private static final Path SPEC = Paths.get(
            "src/test/resources/samples/petstore.yaml");

    @Test
    void openApiSpecProducesZipWithCode() throws Exception {
        OpenApiToCodeModule module = new OpenApiToCodeModule();
        ToolResult result = module.process(new ToolInput(List.of(SPEC), Map.of("language", "java")));

        assertThat(result.isFile()).isTrue();
        assertThat(result.outputFile()).exists();
        assertThat(result.outputFile().toString()).endsWith(".zip");
        try (ZipFile zip = new ZipFile(result.outputFile().toFile())) {
            assertThat(zip.size()).isGreaterThan(0);
        }
    }

    @Test
    void moduleMetadata() {
        OpenApiToCodeModule module = new OpenApiToCodeModule();
        assertThat(module.getId()).isEqualTo("openapi-to-code");
        assertThat(module.isHeavy()).isTrue();
        assertThat(module.getCategory()).isEqualTo("codegen");
    }
}
