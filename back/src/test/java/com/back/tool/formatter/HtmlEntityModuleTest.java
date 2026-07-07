package com.back.tool.formatter;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolResult;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class HtmlEntityModuleTest {

    @Test
    void encodesHtmlSpecialChars() {
        HtmlEntityModule module = new HtmlEntityModule();
        ToolResult result = module.process(new ToolInput(
                List.of(), Map.of("text", "<div class=\"test\">Hello & World</div>", "mode", "encode")
        ));

        assertThat(result.isFile()).isFalse();
        assertThat(result.textResult()).contains("&lt;");
        assertThat(result.textResult()).contains("&gt;");
        assertThat(result.textResult()).contains("&amp;");
        assertThat(result.textResult()).contains("&quot;");
    }

    @Test
    void decodesHtmlEntities() {
        HtmlEntityModule module = new HtmlEntityModule();
        ToolResult result = module.process(new ToolInput(
                List.of(), Map.of("text", "&lt;p&gt;Hello &amp; World&lt;/p&gt;", "mode", "decode")
        ));

        assertThat(result.isFile()).isFalse();
        assertThat(result.textResult()).isEqualTo("<p>Hello & World</p>");
    }

    @Test
    void moduleMetadata() {
        HtmlEntityModule module = new HtmlEntityModule();
        assertThat(module.getId()).isEqualTo("html-entity");
        assertThat(module.isHeavy()).isFalse();
    }
}
