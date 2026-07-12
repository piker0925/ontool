package com.back.tool.devops;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CronModuleTest {

    private static final ObjectMapper JSON = new ObjectMapper();
    private static final DateTimeFormatter LOCAL_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    /** keyvalue JSON 결과를 key→value 순서 보존 맵으로 파싱한다. */
    @SuppressWarnings("unchecked")
    private static Map<String, String> items(ToolResult result) throws Exception {
        Map<String, Object> root = JSON.readValue(result.textResult(), Map.class);
        assertThat(root.get("type")).isEqualTo("keyvalue");
        Map<String, String> map = new LinkedHashMap<>();
        for (Map<String, String> item : (List<Map<String, String>>) root.get("items")) {
            map.put(item.get("key"), item.get("value"));
        }
        return map;
    }

    private static ToolResult run(Map<String, String> params) {
        return new CronModule().process(new ToolInput(List.of(), params));
    }

    @Test
    void dailyMidnightProducesFiveDistinctMidnightsInDefaultSeoulTimezone() throws Exception {
        Map<String, String> items = items(run(Map.of("expression", "0 0 * * *")));

        // 타임존 미지정 시 Asia/Seoul 기본 + 오프셋 표기 (패턴 B: 아래 UTC 지정 테스트와 대비)
        assertThat(items.get("타임존")).isEqualTo("Asia/Seoul (UTC+09:00)");

        // 기본 count=5 정확히 — "다음 실행 6"은 없어야 한다.
        assertThat(items).containsKeys("다음 실행 1", "다음 실행 5").doesNotContainKey("다음 실행 6");
        for (int i = 1; i <= 5; i++) {
            // 매일 자정이므로 now()와 무관하게 시각은 00:00:00, 타임존 약자 KST가 붙어야 한다.
            assertThat(items.get("다음 실행 " + i)).endsWith(" 00:00:00 KST");
        }
        // 같은 시각 반복 출력 뮤턴트 방지 — 5개가 모두 다른 날짜여야 한다.
        long distinct = items.entrySet().stream()
                .filter(e -> e.getKey().startsWith("다음 실행"))
                .map(Map.Entry::getValue).distinct().count();
        assertThat(distinct).isEqualTo(5);
    }

    @Test
    void parsesMinuteHourAndDayOfWeekFields() throws Exception {
        Map<String, String> items = items(run(Map.of("expression", "30 14 * * 1", "count", "3")));

        assertThat(items).containsKey("다음 실행 3").doesNotContainKey("다음 실행 4");
        // "30 14 * * 1" = 매주 월요일 14:30 — 필드 인덱스를 뒤바꾸는 뮤턴트를 잡는다.
        for (int i = 1; i <= 3; i++) {
            String value = items.get("다음 실행 " + i);
            assertThat(value).contains(" 14:30:00 ");
            LocalDate date = LocalDate.parse(value.substring(0, 10));
            assertThat(date.getDayOfWeek()).isEqualTo(DayOfWeek.MONDAY);
        }
    }

    @Test
    void describesEachFieldInKorean() throws Exception {
        Map<String, String> items = items(run(Map.of("expression", "*/15 9-18 * * 1-5")));

        // 필드 해석을 독립 기준값과 정확 비교 (패턴 A: 존재 여부만 확인하지 않는다)
        assertThat(items.get("분")).isEqualTo("15분마다");
        assertThat(items.get("시")).isEqualTo("9시~18시");
        assertThat(items.get("일")).isEqualTo("매일");
        assertThat(items.get("월")).isEqualTo("매월");
        assertThat(items.get("요일")).isEqualTo("월요일~금요일");
    }

    @Test
    void describesListsSingleValuesAndSteps() throws Exception {
        Map<String, String> items = items(run(Map.of("expression", "0,30 12 1 JAN MON")));

        assertThat(items.get("분")).isEqualTo("0분, 30분");
        assertThat(items.get("시")).isEqualTo("12시");
        assertThat(items.get("일")).isEqualTo("1일");
        assertThat(items.get("월")).isEqualTo("1월");
        assertThat(items.get("요일")).isEqualTo("월요일");
    }

    @Test
    void appliesSelectedTimezoneAndResultsDifferByUtcOffset() throws Exception {
        // 다음 실행 "시각"을 고정 기준과 비교하는 것은 시간 의존이므로,
        // 대신 서로 다른 타임존 두 결과의 순간(Instant)이 시차(9시간)만큼 다른지 검증한다.
        Map<String, String> seoul = items(run(Map.of("expression", "30 14 * * *", "timezone", "Asia/Seoul")));
        Map<String, String> utc = items(run(Map.of("expression", "30 14 * * *", "timezone", "UTC")));

        assertThat(seoul.get("타임존")).isEqualTo("Asia/Seoul (UTC+09:00)");
        assertThat(utc.get("타임존")).isEqualTo("UTC (UTC+00:00)");

        String seoulFirst = seoul.get("다음 실행 1");
        String utcFirst = utc.get("다음 실행 1");
        // 두 결과 모두 해당 타임존의 벽시계 기준 14:30 + 타임존 약자 표기
        assertThat(seoulFirst).endsWith(" 14:30:00 KST");
        assertThat(utcFirst).endsWith(" 14:30:00 UTC");

        Instant seoulInstant = LocalDateTime.parse(seoulFirst.substring(0, 19), LOCAL_FMT)
                .atZone(ZoneId.of("Asia/Seoul")).toInstant();
        Instant utcInstant = LocalDateTime.parse(utcFirst.substring(0, 19), LOCAL_FMT)
                .atZone(ZoneId.of("UTC")).toInstant();
        // KST 14:30은 UTC 14:30보다 항상 9시간 이른 순간 — 날짜가 하루 어긋나도 mod 24h로 540분.
        long diffMinutes = Math.floorMod(Duration.between(seoulInstant, utcInstant).toMinutes(), 24 * 60);
        assertThat(diffMinutes).isEqualTo(9 * 60);
    }

    @Test
    void invalidMinuteFieldReportsFieldNameAndRange() {
        assertThatThrownBy(() -> run(Map.of("expression", "61 * * * *")))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("분 필드")
                .hasMessageContaining("61")
                .hasMessageContaining("0~59");
    }

    @Test
    void invalidHourFieldReportsFieldNameAndRange() {
        assertThatThrownBy(() -> run(Map.of("expression", "* 24 * * *")))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("시 필드")
                .hasMessageContaining("0~23");
    }

    @Test
    void invalidDayOfWeekFieldReportsFieldNameAndRange() {
        assertThatThrownBy(() -> run(Map.of("expression", "* * * * 8")))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("요일 필드")
                .hasMessageContaining("0~7");
    }

    @Test
    void invalidRangeOrderReportsReason() {
        assertThatThrownBy(() -> run(Map.of("expression", "* 18-9 * * *")))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("시 필드")
                .hasMessageContaining("범위 시작");
    }

    @Test
    void wrongFieldCountReportsCount() {
        assertThatThrownBy(() -> run(Map.of("expression", "0 0 *")))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("3개")
                .hasMessageContaining("5개 필드");
    }

    @Test
    void unknownTimezoneReportsKoreanError() {
        assertThatThrownBy(() -> run(Map.of("expression", "0 0 * * *", "timezone", "Mars/Olympus")))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("타임존")
                .hasMessageContaining("Mars/Olympus");
    }

    @Test
    void moduleMetadata() {
        CronModule module = new CronModule();
        assertThat(module.getId()).isEqualTo("cron");
        assertThat(module.isHeavy()).isFalse();
        assertThat(module.getCategory()).isEqualTo("devops");
    }
}
