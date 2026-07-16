package com.back.tool.converter;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolModule;
import com.back.tool.model.ToolParams;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLGenerator;
import com.fasterxml.jackson.dataformat.yaml.YAMLMapper;
import org.springframework.stereotype.Component;

@Component
public class JsonYamlModule implements ToolModule {

    private static final ObjectMapper JSON = new ObjectMapper();
    private static final YAMLMapper YAML = YAMLMapper.builder()
            .enable(YAMLGenerator.Feature.MINIMIZE_QUOTES)
            .disable(YAMLGenerator.Feature.WRITE_DOC_START_MARKER)
            .build();

    @Override
    public String getId() { return "json-yaml"; }

    @Override
    public String getName() { return "JSON ↔ YAML 변환"; }

    @Override
    public String getCategory() { return "converter"; }

    @Override
    public boolean isHeavy() { return false; }

    @Override
    public ToolResult process(ToolInput input) {
        ToolParams params = ToolParams.of(input);
        String text = params.getString("input", "");
        String direction = params.getString("direction", "json-to-yaml");
        try {
            if ("yaml-to-json".equals(direction)) {
                JsonNode node = YAML.readTree(text);
                return ToolResult.ofText(JSON.writerWithDefaultPrettyPrinter().writeValueAsString(node));
            } else {
                JsonNode node = JSON.readTree(text);
                return ToolResult.ofText(YAML.writeValueAsString(node).trim());
            }
        } catch (Exception e) {
            throw new ToolProcessingException("변환 실패: " + e.getMessage(), e);
        }
    }
}
