package com.back.tool.devops;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolModule;
import com.back.tool.model.ToolParams;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import com.cronutils.model.Cron;
import com.cronutils.model.CronType;
import com.cronutils.model.definition.CronDefinitionBuilder;
import com.cronutils.model.time.ExecutionTime;
import com.cronutils.parser.CronParser;
import org.springframework.stereotype.Component;

import java.time.DateTimeException;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@Component
public class CronModule implements ToolModule {

    private static final CronParser PARSER = new CronParser(
            CronDefinitionBuilder.instanceDefinitionFor(CronType.UNIX));
    private static final DateTimeFormatter FMT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss z", Locale.ENGLISH);

    private static final String DEFAULT_TIMEZONE = "Asia/Seoul";

    private static final String[] FIELD_NAMES = {"분", "시", "일", "월", "요일"};
    private static final int[] FIELD_MIN = {0, 0, 1, 1, 0};
    private static final int[] FIELD_MAX = {59, 23, 31, 12, 7};
    /** 스텝(/n) 설명에 쓰는 단위 — "15분마다", "2시간 간격" 등 */
    private static final String[] STEP_UNIT = {"분", "시간", "일", "개월", "요일"};
    private static final String[] EVERY = {"매분", "매시", "매일", "매월", "모든 요일"};
    private static final String[] DOW_KO = {"일", "월", "화", "수", "목", "금", "토"};

    private static final Map<String, Integer> MONTH_ALIAS = Map.ofEntries(
            Map.entry("JAN", 1), Map.entry("FEB", 2), Map.entry("MAR", 3), Map.entry("APR", 4),
            Map.entry("MAY", 5), Map.entry("JUN", 6), Map.entry("JUL", 7), Map.entry("AUG", 8),
            Map.entry("SEP", 9), Map.entry("OCT", 10), Map.entry("NOV", 11), Map.entry("DEC", 12));
    private static final Map<String, Integer> DOW_ALIAS = Map.of(
            "SUN", 0, "MON", 1, "TUE", 2, "WED", 3, "THU", 4, "FRI", 5, "SAT", 6);

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
        ToolParams params = ToolParams.of(input);
        String expression = params.requireString("expression").trim();
        int count = params.getInt("count", 5, 1, 50);
        String timezone = params.getString("timezone", DEFAULT_TIMEZONE).trim();

        ZoneId zone = parseZone(timezone);
        String[] fields = validateFields(expression);

        Cron cron;
        try {
            cron = PARSER.parse(expression);
        } catch (Exception e) {
            throw new ToolProcessingException("Cron 표현식이 잘못되었습니다: " + e.getMessage(), e);
        }

        ExecutionTime executionTime = ExecutionTime.forCron(cron);
        ZonedDateTime cursor = ZonedDateTime.now(zone);

        List<Map<String, String>> items = new ArrayList<>();
        items.add(item("타임존", timezone + " (UTC" + offsetOf(cursor) + ")"));
        for (int i = 0; i < 5; i++) {
            items.add(item(FIELD_NAMES[i], describeField(i, fields[i])));
        }
        for (int i = 1; i <= count; i++) {
            Optional<ZonedDateTime> next = executionTime.nextExecution(cursor);
            if (next.isEmpty()) break;
            cursor = next.get();
            items.add(item("다음 실행 " + i, cursor.format(FMT)));
        }

        return ToolResult.ofJson(Map.of("type", "keyvalue", "items", items));
    }

    private Map<String, String> item(String key, String value) {
        return Map.of("key", key, "value", value);
    }

    private String offsetOf(ZonedDateTime zdt) {
        String id = zdt.getOffset().getId();
        return "Z".equals(id) ? "+00:00" : id;
    }

    private ZoneId parseZone(String timezone) {
        try {
            return ZoneId.of(timezone);
        } catch (DateTimeException e) {
            throw new ToolProcessingException(
                    "알 수 없는 타임존입니다: '" + timezone + "' (예: Asia/Seoul, UTC, America/New_York)", e);
        }
    }

    // ---- 필드별 검증 (어느 필드가 왜 틀렸는지 한국어로) ----

    private String[] validateFields(String expression) {
        String[] fields = expression.split("\\s+");
        if (fields.length != 5) {
            throw new ToolProcessingException(
                    "필드 개수가 " + fields.length + "개입니다. UNIX cron 표현식은 5개 필드(분 시 일 월 요일)여야 합니다.");
        }
        for (int i = 0; i < 5; i++) {
            validateField(i, fields[i]);
        }
        return fields;
    }

    private void validateField(int idx, String field) {
        for (String part : field.split(",", -1)) {
            if (part.isEmpty()) {
                fieldError(idx, field, "빈 항목(연속된 쉼표)이 있습니다");
            }
            String base = part;
            int slash = part.indexOf('/');
            if (slash >= 0) {
                base = part.substring(0, slash);
                String step = part.substring(slash + 1);
                int s;
                try {
                    s = Integer.parseInt(step);
                } catch (NumberFormatException e) {
                    fieldError(idx, field, "간격(/ 뒤 값) '" + step + "'이(가) 숫자가 아닙니다");
                    return;
                }
                if (s < 1) fieldError(idx, field, "간격(/ 뒤 값)은 1 이상이어야 합니다 (입력: " + s + ")");
            }
            if (base.equals("*")) continue;
            int dash = base.indexOf('-');
            if (dash > 0) {
                int from = parseValue(idx, base.substring(0, dash), field);
                int to = parseValue(idx, base.substring(dash + 1), field);
                if (from > to) fieldError(idx, field, "범위 시작(" + from + ")이 끝(" + to + ")보다 큽니다");
            } else {
                parseValue(idx, base, field);
            }
        }
    }

    private int parseValue(int idx, String value, String field) {
        Map<String, Integer> alias = idx == 3 ? MONTH_ALIAS : idx == 4 ? DOW_ALIAS : Map.of();
        Integer mapped = alias.get(value.toUpperCase(Locale.ROOT));
        int n;
        if (mapped != null) {
            n = mapped;
        } else {
            try {
                n = Integer.parseInt(value);
            } catch (NumberFormatException e) {
                fieldError(idx, field, "'" + value + "'은(는) 숫자가 아닙니다");
                return -1; // unreachable
            }
        }
        if (n < FIELD_MIN[idx] || n > FIELD_MAX[idx]) {
            fieldError(idx, field, "값 " + n + "은(는) 허용 범위 " + FIELD_MIN[idx] + "~" + FIELD_MAX[idx] + "를 벗어났습니다");
        }
        return n;
    }

    private void fieldError(int idx, String field, String reason) {
        throw new ToolProcessingException(
                FIELD_NAMES[idx] + " 필드 '" + field + "'이(가) 잘못되었습니다: " + reason
                        + ". (" + FIELD_NAMES[idx] + " 필드 허용 범위: " + FIELD_MIN[idx] + "~" + FIELD_MAX[idx] + ")");
    }

    // ---- 필드 해석 (분/시/일/월/요일 값 요약) ----

    private String describeField(int idx, String field) {
        List<String> parts = new ArrayList<>();
        for (String part : field.split(",")) {
            parts.add(describePart(idx, part));
        }
        return String.join(", ", parts);
    }

    private String describePart(int idx, String part) {
        String base = part;
        Integer step = null;
        int slash = part.indexOf('/');
        if (slash >= 0) {
            base = part.substring(0, slash);
            step = Integer.parseInt(part.substring(slash + 1));
        }
        if (base.equals("*")) {
            return step == null ? EVERY[idx] : step + STEP_UNIT[idx] + "마다";
        }
        int dash = base.indexOf('-');
        if (dash > 0) {
            String desc = valueLabel(idx, base.substring(0, dash)) + "~" + valueLabel(idx, base.substring(dash + 1));
            if (step != null) desc += " (" + step + STEP_UNIT[idx] + " 간격)";
            return desc;
        }
        String desc = valueLabel(idx, base);
        if (step != null) desc += "부터 " + step + STEP_UNIT[idx] + "마다";
        return desc;
    }

    private String valueLabel(int idx, String value) {
        Map<String, Integer> alias = idx == 3 ? MONTH_ALIAS : idx == 4 ? DOW_ALIAS : Map.of();
        Integer mapped = alias.get(value.toUpperCase(Locale.ROOT));
        int n = mapped != null ? mapped : Integer.parseInt(value);
        return switch (idx) {
            case 0 -> n + "분";
            case 1 -> n + "시";
            case 2 -> n + "일";
            case 3 -> n + "월";
            default -> DOW_KO[n % 7] + "요일";
        };
    }
}
