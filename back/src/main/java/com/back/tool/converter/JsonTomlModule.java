package com.back.tool.converter;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolModule;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.moandjiezana.toml.Toml;
import com.moandjiezana.toml.TomlWriter;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class JsonTomlModule implements ToolModule {

    private static final ObjectMapper JSON = new ObjectMapper();

    @Override
    public String getId() { return "json-toml"; }

    @Override
    public String getName() { return "JSON ↔ TOML 변환"; }

    @Override
    public String getCategory() { return "converter"; }

    @Override
    public boolean isHeavy() { return false; }

    @Override
    @SuppressWarnings("unchecked")
    public ToolResult process(ToolInput input) {
        String text = input.params().getOrDefault("input", "");
        String direction = input.params().getOrDefault("direction", "json-to-toml");
        try {
            if ("toml-to-json".equals(direction)) {
                Map<String, Object> map = new Toml().read(text).toMap();
                return ToolResult.ofText(JSON.writerWithDefaultPrettyPrinter().writeValueAsString(map));
            } else {
                Map<String, Object> map = JSON.readValue(text, Map.class);
                return ToolResult.ofText(new TomlWriter().write(map));
            }
        } catch (Exception e) {
            throw new ToolProcessingException("변환 실패: " + e.getMessage(), e);
        }
    }
}
