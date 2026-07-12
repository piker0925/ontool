package com.back.tool.formatter;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SqlFormatterModuleTest {

    private static final String COMPLEX_SQL =
            "select u.id, u.name from users u left join orders o on o.user_id = u.id "
                    + "where o.total > 1000 and u.active = 1 order by o.total desc limit 10";

    private final SqlFormatterModule module = new SqlFormatterModule();

    private ToolResult run(Map<String, String> params) {
        return module.process(new ToolInput(List.of(), params));
    }

    @Test
    void formatsSelectWithClauseLineBreaks() {
        ToolResult result = run(Map.of("sql", "select id,name from users where id=1"));

        assertThat(result.isFile()).isFalse();
        // JSqlParser 정규화(키워드 대문자화, 콤마/= 공백) + 절 단위 줄바꿈.
        // 입력을 그대로 되돌리거나 절 순서를 망가뜨리는 뮤턴트는 이 exact-match에서 실패한다.
        assertThat(result.textResult()).isEqualTo(
                "SELECT id, name\nFROM users\nWHERE id = 1");
    }

    @Test
    void indentsJoinAndBooleanConditions() {
        ToolResult result = run(Map.of("sql", COMPLEX_SQL));

        assertThat(result.textResult()).isEqualTo(
                "SELECT u.id, u.name\n"
                        + "FROM users u\n"
                        + "  LEFT JOIN orders o ON o.user_id = u.id\n"
                        + "WHERE o.total > 1000\n"
                        + "  AND u.active = 1\n"
                        + "ORDER BY o.total DESC\n"
                        + "LIMIT 10");
    }

    @Test
    void indentWidthChangesLeadingSpaces() {
        // 패턴 B: indent=4는 보조 절 앞 공백만 4칸으로 바뀌고 나머지는 동일해야 한다.
        ToolResult result = run(Map.of("sql", COMPLEX_SQL, "indent", "4"));

        assertThat(result.textResult()).isEqualTo(
                "SELECT u.id, u.name\n"
                        + "FROM users u\n"
                        + "    LEFT JOIN orders o ON o.user_id = u.id\n"
                        + "WHERE o.total > 1000\n"
                        + "    AND u.active = 1\n"
                        + "ORDER BY o.total DESC\n"
                        + "LIMIT 10");
    }

    @Test
    void uppercaseOffLowercasesKeywordsButNotIdentifiers() {
        // 패턴 B: uppercase=false는 키워드만 소문자화, 식별자(u.id, users)는 그대로.
        ToolResult result = run(Map.of("sql", COMPLEX_SQL, "uppercase", "false"));

        assertThat(result.textResult()).isEqualTo(
                "select u.id, u.name\n"
                        + "from users u\n"
                        + "  left join orders o on o.user_id = u.id\n"
                        + "where o.total > 1000\n"
                        + "  and u.active = 1\n"
                        + "order by o.total desc\n"
                        + "limit 10");
    }

    @Test
    void uppercaseOnKeepsUppercaseKeywords() {
        // 패턴 B 대비쌍: uppercase=true(기본)와 명시적 true가 동일한 대문자 출력.
        ToolResult explicit = run(Map.of("sql", "select id from t", "uppercase", "true"));
        assertThat(explicit.textResult()).isEqualTo("SELECT id\nFROM t");
    }

    @Test
    void keywordInsideStringLiteralIsNotTouched() {
        ToolResult result = run(Map.of(
                "sql", "select * from t where name = 'x FROM y AND z'", "uppercase", "false"));

        // 리터럴 내부의 FROM/AND는 줄바꿈·소문자화 대상이 아니다.
        assertThat(result.textResult()).isEqualTo(
                "select *\nfrom t\nwhere name = 'x FROM y AND z'");
    }

    @Test
    void betweenAndStaysOnOneLine() {
        ToolResult result = run(Map.of(
                "sql", "select * from t where a between 1 and 2 and b = 3"));

        // BETWEEN 1 AND 2 의 AND는 줄바꿈하지 않고, 그 뒤 논리 AND만 줄바꿈한다.
        assertThat(result.textResult()).isEqualTo(
                "SELECT *\nFROM t\nWHERE a BETWEEN 1 AND 2\n  AND b = 3");
    }

    @Test
    void subqueryInsideParensIsNotBroken() {
        ToolResult result = run(Map.of(
                "sql", "select * from t where id in (select id from x where y = 1)"));

        // 괄호 내부(서브쿼리)는 한 줄 유지.
        assertThat(result.textResult()).isEqualTo(
                "SELECT *\nFROM t\nWHERE id IN (SELECT id FROM x WHERE y = 1)");
    }

    @Test
    void invalidSqlThrows() {
        assertThatThrownBy(() -> run(Map.of("sql", "this is not sql")))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("SQL 파싱 실패");
    }

    @Test
    void missingSqlThrows() {
        assertThatThrownBy(() -> run(Map.of()))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("sql");
    }

    @Test
    void invalidIndentThrows() {
        assertThatThrownBy(() -> run(Map.of("sql", "select 1", "indent", "99")))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("indent");
    }

    @Test
    void moduleMetadata() {
        assertThat(module.getId()).isEqualTo("sql-formatter");
        assertThat(module.isHeavy()).isFalse();
        assertThat(module.getCategory()).isEqualTo("formatter");
    }
}
