package com.back.tool.devops;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolResult;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class CronModuleTest {

    @Test
    void returnsNextFiveExecutions() {
        CronModule module = new CronModule();
        ToolResult result = module.process(new ToolInput(
                List.of(), Map.of("expression", "0 0 * * *")
        ));

        assertThat(result.isFile()).isFalse();
        String[] lines = result.textResult().lines()
                .filter(l -> !l.isBlank()).toArray(String[]::new);
        assertThat(lines).hasSizeGreaterThanOrEqualTo(5);
    }

    @Test
    void respectsCountParam() {
        CronModule module = new CronModule();
        ToolResult result = module.process(new ToolInput(
                List.of(), Map.of("expression", "0 * * * *", "count", "3")
        ));

        long count = result.textResult().lines().filter(l -> !l.isBlank()).count();
        assertThat(count).isEqualTo(3);
    }

    @Test
    void moduleMetadata() {
        CronModule module = new CronModule();
        assertThat(module.getId()).isEqualTo("cron");
        assertThat(module.isHeavy()).isFalse();
        assertThat(module.getCategory()).isEqualTo("devops");
    }
}
