package com.back.tool.devops;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolModule;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import com.cronutils.model.Cron;
import com.cronutils.model.CronType;
import com.cronutils.model.definition.CronDefinitionBuilder;
import com.cronutils.model.time.ExecutionTime;
import com.cronutils.parser.CronParser;
import org.springframework.stereotype.Component;

import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Component
public class CronModule implements ToolModule {

    private static final CronParser PARSER = new CronParser(
            CronDefinitionBuilder.instanceDefinitionFor(CronType.UNIX));
    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss z");

    @Override
    public String getId() { return "cron"; }

    @Override
    public String getName() { return "Cron 표현식 파서"; }

    @Override
    public String getCategory() { return "devops"; }

    @Override
    public boolean isHeavy() { return false; }

    @Override
    public ToolResult process(ToolInput input) {
        String expression = input.params().getOrDefault("expression", "");
        int count = Integer.parseInt(input.params().getOrDefault("count", "5"));
        try {
            Cron cron = PARSER.parse(expression);
            ExecutionTime executionTime = ExecutionTime.forCron(cron);
            List<String> times = new ArrayList<>();
            ZonedDateTime cursor = ZonedDateTime.now();
            for (int i = 0; i < count; i++) {
                Optional<ZonedDateTime> next = executionTime.nextExecution(cursor);
                if (next.isEmpty()) break;
                cursor = next.get();
                times.add(cursor.format(FMT));
            }
            return ToolResult.ofText(String.join("\n", times));
        } catch (Exception e) {
            throw new ToolProcessingException("Cron 파싱 실패: " + e.getMessage(), e);
        }
    }
}
