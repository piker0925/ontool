package com.back.tool.formatter;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolModule;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import net.sf.jsqlparser.parser.CCJSqlParserUtil;
import net.sf.jsqlparser.statement.Statement;
import org.springframework.stereotype.Component;

@Component
public class SqlFormatterModule implements ToolModule {

    @Override
    public String getId() { return "sql-formatter"; }

    @Override
    public String getName() { return "SQL 포맷터"; }

    @Override
    public String getCategory() { return "formatter"; }

    @Override
    public boolean isHeavy() { return false; }

    @Override
    public ToolResult process(ToolInput input) {
        String sql = input.params().getOrDefault("sql", "");
        try {
            Statement stmt = CCJSqlParserUtil.parse(sql);
            return ToolResult.ofText(stmt.toString());
        } catch (Exception e) {
            throw new ToolProcessingException("SQL 파싱 실패: " + e.getMessage(), e);
        }
    }
}
