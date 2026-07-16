package com.back.tool.converter;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolModule;
import com.back.tool.model.ToolParams;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.xml.XmlMapper;
import org.springframework.stereotype.Component;

@Component
public class JsonXmlModule implements ToolModule {

    private static final ObjectMapper JSON = new ObjectMapper();
    private static final XmlMapper XML = new XmlMapper();

    @Override
    public String getId() { return "json-xml"; }

    @Override
    public String getName() { return "JSON ↔ XML 변환"; }

    @Override
    public String getCategory() { return "converter"; }

    @Override
    public boolean isHeavy() { return false; }

    @Override
    public ToolResult process(ToolInput input) {
        ToolParams params = ToolParams.of(input);
        String text = params.getString("input", "");
        String direction = params.getString("direction", "json-to-xml");
        try {
            if ("xml-to-json".equals(direction)) {
                JsonNode node = XML.readTree(text);
                return ToolResult.ofText(JSON.writerWithDefaultPrettyPrinter().writeValueAsString(node));
            } else {
                JsonNode node = JSON.readTree(text);
                return ToolResult.ofText(XML.writerWithDefaultPrettyPrinter().writeValueAsString(node));
            }
        } catch (Exception e) {
            throw new ToolProcessingException("변환 실패: " + e.getMessage(), e);
        }
    }
}
