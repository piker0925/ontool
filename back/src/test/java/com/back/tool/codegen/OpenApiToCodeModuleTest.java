package com.back.tool.codegen;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import org.junit.jupiter.api.Test;

import java.io.InputStream;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

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
            boolean hasJava = zip.stream().anyMatch(e -> e.getName().endsWith(".java"));
            assertThat(hasJava).isTrue();

            ZipEntry petModel = zip.stream()
                    .filter(e -> e.getName().endsWith(".java") && e.getName().contains("Pet"))
                    .findFirst()
                    .orElseThrow(() -> new AssertionError("no generated Pet model in zip"));
            String source;
            try (InputStream in = zip.getInputStream(petModel)) {
                source = new String(in.readAllBytes());
            }
            assertThat(source).contains("id").contains("name");
        }
    }

    @Test
    void 파일_0개면_ToolProcessingException을_던진다() {
        OpenApiToCodeModule module = new OpenApiToCodeModule();
        assertThatThrownBy(() -> module.process(new ToolInput(List.of(), Map.of())))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("처리할 파일이 없습니다");
    }

    @Test
    void moduleMetadata() {
        OpenApiToCodeModule module = new OpenApiToCodeModule();
        assertThat(module.getId()).isEqualTo("openapi-to-code");
        assertThat(module.isHeavy()).isTrue();
        assertThat(module.getCategory()).isEqualTo("codegen");
    }
}
