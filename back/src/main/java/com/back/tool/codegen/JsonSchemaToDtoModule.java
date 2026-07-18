package com.back.tool.codegen;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolModule;
import com.back.tool.model.ToolParams;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import com.fasterxml.jackson.core.JsonLocation;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.codemodel.JCodeModel;
import com.sun.codemodel.JDefinedClass;
import com.sun.codemodel.JFieldVar;
import org.jsonschema2pojo.DefaultGenerationConfig;
import org.jsonschema2pojo.GenerationConfig;
import org.jsonschema2pojo.Jackson2Annotator;
import org.jsonschema2pojo.SchemaGenerator;
import org.jsonschema2pojo.SchemaMapper;
import org.jsonschema2pojo.SchemaStore;
import org.jsonschema2pojo.SourceType;
import org.jsonschema2pojo.rules.RuleFactory;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.regex.Pattern;

@Component
public class JsonSchemaToDtoModule implements ToolModule {

    /** 입력 형식: JSON Schema 문서 또는 예시 JSON 데이터(구조 자동 추론) */
    enum InputType { SCHEMA, JSON }

    /** 생성 스타일: Jackson(getter/setter 포함) 또는 Lombok(@Data) */
    enum DtoStyle { JACKSON, LOMBOK }

    private static final Pattern PACKAGE_PATTERN =
            Pattern.compile("[a-zA-Z_$][a-zA-Z0-9_$]*(\\.[a-zA-Z_$][a-zA-Z0-9_$]*)*");

    /** 이 키워드가 하나도 없으면 JSON Schema 문서가 아니라 예시 JSON 데이터일 가능성이 높다 */
    private static final List<String> SCHEMA_KEYWORDS = List.of(
            "$schema", "type", "properties", "items", "required", "allOf", "anyOf", "oneOf",
            "not", "$ref", "enum", "definitions", "$defs", "additionalProperties", "patternProperties");

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public String getId() { return "json-schema-to-dto"; }

    @Override
    public String getName() { return "JSON Schema → DTO"; }

    @Override
    public String getCategory() { return "codegen"; }

    @Override
    public boolean isHeavy() { return true; }

    @Override
    public ToolResult process(ToolInput input) {
        requireFiles(input);
        ToolParams params = ToolParams.of(input);
        InputType inputType = params.getEnum("inputType", InputType.class, InputType.SCHEMA);
        DtoStyle dtoStyle = params.getEnum("dtoStyle", DtoStyle.class, DtoStyle.JACKSON);
        String packageName = params.getString("packageName", "com.generated");
        if (!PACKAGE_PATTERN.matcher(packageName).matches()) {
            throw new ToolProcessingException(
                    "패키지명이 올바르지 않습니다. 'com.example.dto' 형식이어야 합니다. (입력값: " + packageName + ")");
        }

        Path schemaFile = input.files().get(0);
        validateInput(schemaFile, inputType);

        String className = schemaFile.getFileName().toString()
                .replaceAll("\\.json$", "").replaceAll("[^a-zA-Z0-9]", "_");
        try {
            Path outputDir = Files.createTempDirectory("j2p-");
            generateDto(schemaFile, outputDir, packageName, className, inputType, dtoStyle);

            Path zipPath = Files.createTempFile("j2p-", ".zip");
            CodegenZipSupport.zipDirectory(outputDir, zipPath);
            CodegenZipSupport.deleteDir(outputDir.toFile());
            return ToolResult.ofFile(zipPath);
        } catch (ToolProcessingException e) {
            throw e;
        } catch (Exception e) {
            throw new ToolProcessingException("DTO 생성 실패: " + e.getMessage(), e);
        }
    }

    /**
     * 생성 전에 입력을 미리 파싱해 어느 지점에서 왜 실패했는지 명확한 메시지를 만든다.
     * (jsonschema2pojo에 바로 넘기면 필드 없는 빈 클래스가 조용히 생성되거나 영문 스택 메시지만 남는다)
     */
    private void validateInput(Path file, InputType inputType) {
        String text;
        try {
            text = Files.readString(file);
        } catch (IOException e) {
            throw new ToolProcessingException("입력 파일을 읽을 수 없습니다: " + e.getMessage(), e);
        }
        if (text.isBlank()) {
            throw new ToolProcessingException("입력이 비어 있습니다. JSON Schema 또는 예시 JSON을 입력하세요.");
        }

        JsonNode root;
        try {
            root = objectMapper.readTree(text);
        } catch (JsonProcessingException e) {
            JsonLocation loc = e.getLocation();
            String position = loc == null ? "" : " (" + loc.getLineNr() + "행 " + loc.getColumnNr() + "열)";
            throw new ToolProcessingException(
                    "JSON 파싱 실패" + position + ": " + e.getOriginalMessage(), e);
        }

        if (inputType == InputType.SCHEMA) {
            if (!root.isObject()) {
                throw new ToolProcessingException(
                        "JSON Schema는 최상위가 객체({...})여야 합니다. (현재: " + nodeTypeName(root) + ")");
            }
            boolean hasSchemaKeyword = SCHEMA_KEYWORDS.stream().anyMatch(root::has);
            if (!hasSchemaKeyword) {
                throw new ToolProcessingException(
                        "JSON Schema 키워드(type, properties, $ref 등)를 찾을 수 없습니다. "
                                + "예시 JSON 데이터를 붙여넣었다면 '입력 형식'을 json으로 변경하세요.");
            }
        } else {
            if (!root.isObject() && !root.isArray()) {
                throw new ToolProcessingException(
                        "예시 JSON은 최상위가 객체({...}) 또는 배열([...])이어야 합니다. (현재: " + nodeTypeName(root) + ")");
            }
        }
    }

    private String nodeTypeName(JsonNode node) {
        if (node.isArray()) return "배열";
        if (node.isTextual()) return "문자열";
        if (node.isNumber()) return "숫자";
        if (node.isBoolean()) return "불리언";
        if (node.isNull()) return "null";
        return node.getNodeType().name().toLowerCase();
    }

    private void generateDto(Path schema, Path outputDir, String pkg, String className,
                             InputType inputType, DtoStyle dtoStyle) throws Exception {
        GenerationConfig config = new DefaultGenerationConfig() {
            @Override
            public SourceType getSourceType() {
                return inputType == InputType.JSON ? SourceType.JSON : SourceType.JSONSCHEMA;
            }

            @Override
            public boolean isIncludeGetters() { return dtoStyle != DtoStyle.LOMBOK; }

            @Override
            public boolean isIncludeSetters() { return dtoStyle != DtoStyle.LOMBOK; }

            @Override
            public boolean isIncludeToString() { return dtoStyle != DtoStyle.LOMBOK; }

            @Override
            public boolean isIncludeHashcodeAndEquals() { return dtoStyle != DtoStyle.LOMBOK; }

            @Override
            public boolean isIncludeAdditionalProperties() { return dtoStyle != DtoStyle.LOMBOK; }
        };
        Jackson2Annotator annotator = dtoStyle == DtoStyle.LOMBOK
                ? new LombokAnnotator(config)
                : new Jackson2Annotator(config);
        SchemaMapper mapper = new SchemaMapper(
                new RuleFactory(config, annotator, new SchemaStore()),
                new SchemaGenerator());
        JCodeModel codeModel = new JCodeModel();
        mapper.generate(codeModel, className, pkg, schema.toUri().toURL());
        codeModel.build(outputDir.toFile());
    }

    /** 생성된 각 클래스에 lombok @Data 를 붙이는 Annotator (getter/setter 생성은 config에서 끔) */
    private static class LombokAnnotator extends Jackson2Annotator {
        LombokAnnotator(GenerationConfig config) {
            super(config);
        }

        @Override
        public void propertyInclusion(JDefinedClass clazz, JsonNode schema) {
            super.propertyInclusion(clazz, schema);
            clazz.annotate(clazz.owner().ref("lombok.Data"));
        }

        /** 접근자 생성을 끄면 jsonschema2pojo가 필드를 public으로 만들므로 private으로 되돌린다 */
        @Override
        public void propertyField(JFieldVar field, JDefinedClass clazz,
                                  String propertyName, JsonNode propertyNode) {
            super.propertyField(field, clazz, propertyName, propertyNode);
            field.mods().setPrivate();
        }
    }
}
