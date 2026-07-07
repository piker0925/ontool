package com.back.tool.formatter;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolModule;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import org.apache.commons.text.StringEscapeUtils;
import org.springframework.stereotype.Component;

@Component
public class HtmlEntityModule implements ToolModule {

    @Override
    public String getId() { return "html-entity"; }

    @Override
    public String getName() { return "HTML Entity 인코더/디코더"; }

    @Override
    public String getCategory() { return "formatter"; }

    @Override
    public boolean isHeavy() { return false; }

    @Override
    public ToolResult process(ToolInput input) {
        String text = input.params().getOrDefault("text", "");
        String mode = input.params().getOrDefault("mode", "encode");
        try {
            String result = "decode".equalsIgnoreCase(mode)
                    ? StringEscapeUtils.unescapeHtml4(text)
                    : StringEscapeUtils.escapeHtml4(text);
            return ToolResult.ofText(result);
        } catch (Exception e) {
            throw new ToolProcessingException("HTML Entity 처리 실패: " + e.getMessage(), e);
        }
    }
}
