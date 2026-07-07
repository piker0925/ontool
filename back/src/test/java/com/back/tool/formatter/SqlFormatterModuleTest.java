package com.back.tool.formatter;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolResult;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class SqlFormatterModuleTest {

    @Test
    void formatsSelectStatement() {
        SqlFormatterModule module = new SqlFormatterModule();
        ToolResult result = module.process(new ToolInput(
                List.of(), Map.of("sql", "select id,name from users where id=1")
        ));

        assertThat(result.isFile()).isFalse();
        String sql = result.textResult().toUpperCase();
        assertThat(sql).contains("SELECT");
        assertThat(sql).contains("FROM");
        assertThat(sql).contains("WHERE");
    }

    @Test
    void moduleMetadata() {
        SqlFormatterModule module = new SqlFormatterModule();
        assertThat(module.getId()).isEqualTo("sql-formatter");
        assertThat(module.isHeavy()).isFalse();
        assertThat(module.getCategory()).isEqualTo("formatter");
    }
}
