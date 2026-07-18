package com.back.tool.codegen;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JsonSchemaToDtoModuleTest {

    private static final Path SCHEMA = Paths.get(
            "src/test/resources/samples/user-schema.json");

    private final JsonSchemaToDtoModule module = new JsonSchemaToDtoModule();

    @TempDir
    Path tempDir;

    @Test
    void jsonSchemaProducesZipWithJavaFiles() throws Exception {
        ToolResult result = module.process(new ToolInput(List.of(SCHEMA), Map.of("packageName", "com.example")));

        assertThat(result.isFile()).isTrue();
        assertThat(result.outputFile()).exists();
        assertThat(result.outputFile().toString()).endsWith(".zip");
        String source = readSingleJavaEntry(result.outputFile(), "UserSchema.java");
        assertThat(source)
                .contains("package com.example;")
                .contains("public class UserSchema")
                // Jackson 기본 스타일: 필드 + getter/setter 생성
                .contains("private Integer id;")
                .contains("private String name;")
                .contains("private String email;")
                .contains("public Integer getId()")
                .contains("public void setId(Integer id)")
                .doesNotContain("lombok");
    }

    @Test
    void rawJsonInputInfersDtoStructure() throws Exception {
        Path json = tempDir.resolve("user.json");
        Files.writeString(json, """
                {"id": 1, "name": "a", "active": true, "tags": ["x"], "address": {"city": "Seoul"}}
                """);

        ToolResult result = module.process(new ToolInput(List.of(json),
                Map.of("packageName", "com.example", "inputType", "json")));

        try (ZipFile zip = new ZipFile(result.outputFile().toFile())) {
            String user = readEntry(zip, "com/example/User.java");
            assertThat(user)
                    .contains("package com.example;")
                    .contains("public class User")
                    .contains("private Integer id;")
                    .contains("private String name;")
                    .contains("private Boolean active;")
                    .contains("private List<String> tags");
            // 중첩 객체는 별도 클래스로 추론된다
            String address = readEntry(zip, "com/example/Address.java");
            assertThat(address)
                    .contains("public class Address")
                    .contains("private String city;");
        }
    }

    @Test
    void lombokStyleAnnotatesDataAndOmitsAccessors() throws Exception {
        ToolResult result = module.process(new ToolInput(List.of(SCHEMA),
                Map.of("packageName", "com.example", "dtoStyle", "lombok")));

        String source = readSingleJavaEntry(result.outputFile(), "UserSchema.java");
        assertThat(source)
                .containsPattern("@(lombok\\.)?Data")
                .contains("private Integer id;")
                .contains("private String name;")
                // lombok 스타일에서는 접근자/보일러플레이트를 생성하지 않는다
                .doesNotContain("public Integer getId()")
                .doesNotContain("public void setId(")
                .doesNotContain("public String toString()")
                .doesNotContain("public int hashCode()");
    }

    @Test
    void malformedJsonReportsParsePosition() {
        Path broken = write("broken.json", "{\n  \"type\": \"object\",\n  \"properties\": {\n");

        assertThatThrownBy(() -> module.process(new ToolInput(List.of(broken), Map.of())))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("JSON 파싱 실패")
                .hasMessageContaining("행");
    }

    @Test
    void rawJsonPastedInSchemaModeSuggestsInputTypeSwitch() {
        Path rawJson = write("data.json", "{\"id\": 1, \"name\": \"a\"}");

        assertThatThrownBy(() -> module.process(new ToolInput(List.of(rawJson), Map.of("inputType", "schema"))))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("JSON Schema 키워드")
                .hasMessageContaining("json");
    }

    @Test
    void scalarRootRejectedInJsonMode() {
        Path scalar = write("scalar.json", "\"hello\"");

        assertThatThrownBy(() -> module.process(new ToolInput(List.of(scalar), Map.of("inputType", "json"))))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("객체");
    }

    @Test
    void invalidPackageNameRejected() {
        assertThatThrownBy(() -> module.process(new ToolInput(List.of(SCHEMA),
                Map.of("packageName", "com..example"))))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("패키지명");
    }

    @Test
    void blankInputRejected() {
        Path blank = write("blank.json", "   ");

        assertThatThrownBy(() -> module.process(new ToolInput(List.of(blank), Map.of())))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("비어 있습니다");
    }

    @Test
    void invalidEnumParamRejected() {
        Map<String, String> params = new HashMap<>();
        params.put("inputType", "yaml");

        assertThatThrownBy(() -> module.process(new ToolInput(List.of(SCHEMA), params)))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("inputType");
    }

    @Test
    void 파일_0개면_ToolProcessingException을_던진다() {
        assertThatThrownBy(() -> module.process(new ToolInput(List.of(), Map.of())))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("처리할 파일이 없습니다");
    }

    @Test
    void moduleMetadata() {
        assertThat(module.getId()).isEqualTo("json-schema-to-dto");
        assertThat(module.isHeavy()).isTrue();
        assertThat(module.getCategory()).isEqualTo("codegen");
    }

    private Path write(String name, String content) {
        try {
            Path p = tempDir.resolve(name);
            Files.writeString(p, content);
            return p;
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private String readSingleJavaEntry(Path zipPath, String expectedFileName) throws Exception {
        try (ZipFile zip = new ZipFile(zipPath.toFile())) {
            ZipEntry javaEntry = zip.stream()
                    .filter(e -> e.getName().endsWith(".java"))
                    .findFirst()
                    .orElseThrow(() -> new AssertionError("no .java entry in zip"));
            assertThat(javaEntry.getName()).endsWith(expectedFileName);
            try (InputStream in = zip.getInputStream(javaEntry)) {
                return new String(in.readAllBytes());
            }
        }
    }

    private String readEntry(ZipFile zip, String name) throws Exception {
        ZipEntry entry = zip.getEntry(name);
        assertThat(entry).as("zip entry %s (entries: %s)", name,
                zip.stream().map(ZipEntry::getName).toList()).isNotNull();
        try (InputStream in = zip.getInputStream(entry)) {
            return new String(in.readAllBytes());
        }
    }
}
