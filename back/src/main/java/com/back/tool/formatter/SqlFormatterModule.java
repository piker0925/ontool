package com.back.tool.formatter;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolModule;
import com.back.tool.model.ToolParams;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import net.sf.jsqlparser.parser.CCJSqlParserUtil;
import net.sf.jsqlparser.statement.Statement;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;

@Component
public class SqlFormatterModule implements ToolModule {

    /** 절 시작 키워드 — 새 줄, 들여쓰기 없음 (jsqlparser 출력은 항상 대문자) */
    private static final List<String> MAJOR_CLAUSES = List.of(
            "FROM", "WHERE", "GROUP BY", "HAVING", "ORDER BY", "LIMIT", "OFFSET",
            "UNION ALL", "UNION", "EXCEPT", "INTERSECT", "VALUES", "SET", "RETURNING"
    );

    /** 보조 절 키워드 — 새 줄 + 들여쓰기 (긴 변형이 먼저 매칭되도록 순서 유지) */
    private static final List<String> INDENTED_CLAUSES = List.of(
            "LEFT OUTER JOIN", "RIGHT OUTER JOIN", "FULL OUTER JOIN",
            "INNER JOIN", "LEFT JOIN", "RIGHT JOIN", "FULL JOIN", "CROSS JOIN", "JOIN",
            "AND", "OR"
    );

    /** 소문자 변환 대상 SQL 키워드 (jsqlparser가 대문자로 정규화한 토큰만 대상) */
    private static final Set<String> KEYWORDS = Set.of(
            "SELECT", "DISTINCT", "FROM", "WHERE", "GROUP", "BY", "HAVING", "ORDER",
            "LIMIT", "OFFSET", "JOIN", "INNER", "LEFT", "RIGHT", "FULL", "OUTER", "CROSS",
            "ON", "AND", "OR", "NOT", "IN", "IS", "NULL", "LIKE", "BETWEEN", "EXISTS",
            "AS", "ASC", "DESC", "UNION", "ALL", "EXCEPT", "INTERSECT",
            "INSERT", "INTO", "VALUES", "UPDATE", "SET", "DELETE",
            "CASE", "WHEN", "THEN", "ELSE", "END", "RETURNING"
    );

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
        ToolParams params = ToolParams.of(input);
        String sql = params.requireString("sql");
        boolean uppercase = params.getBool("uppercase", true);
        int indentWidth = params.getInt("indent", 2, 1, 8);

        Statement stmt;
        try {
            stmt = CCJSqlParserUtil.parse(sql);
        } catch (Exception e) {
            throw new ToolProcessingException("SQL 파싱 실패: " + e.getMessage(), e);
        }

        String formatted = reflow(stmt.toString(), indentWidth);
        if (!uppercase) {
            formatted = lowercaseKeywords(formatted);
        }
        return ToolResult.ofText(formatted);
    }

    /**
     * jsqlparser가 정규화한 단일 라인 SQL을 절 단위로 줄바꿈한다.
     * 문자열 리터럴('..')과 따옴표 식별자(".."), 괄호 내부(서브쿼리·IN 목록)는 건드리지 않는다.
     */
    private String reflow(String sql, int indentWidth) {
        StringBuilder out = new StringBuilder();
        boolean inSingle = false;
        boolean inDouble = false;
        boolean pendingBetween = false; // BETWEEN a AND b 의 AND는 줄바꿈 제외
        int parenDepth = 0;
        int i = 0;
        while (i < sql.length()) {
            char c = sql.charAt(i);
            if (inSingle) {
                out.append(c);
                if (c == '\'') inSingle = false;
                i++;
                continue;
            }
            if (inDouble) {
                out.append(c);
                if (c == '"') inDouble = false;
                i++;
                continue;
            }
            switch (c) {
                case '\'' -> inSingle = true;
                case '"' -> inDouble = true;
                case '(' -> parenDepth++;
                case ')' -> parenDepth--;
                default -> { }
            }
            if (c == ' ' && parenDepth == 0) {
                String major = matchKeyword(sql, i + 1, MAJOR_CLAUSES);
                String indented = major == null ? matchKeyword(sql, i + 1, INDENTED_CLAUSES) : null;
                String match = major != null ? major : indented;
                if (match != null) {
                    if ("AND".equals(match) && pendingBetween) {
                        pendingBetween = false;
                        out.append(' ');
                        i++;
                        continue;
                    }
                    out.append('\n');
                    if (indented != null) out.append(" ".repeat(indentWidth));
                    out.append(match);
                    i += 1 + match.length();
                    continue;
                }
                if (matchKeyword(sql, i + 1, List.of("BETWEEN")) != null) {
                    pendingBetween = true;
                }
            }
            out.append(c);
            i++;
        }
        return out.toString();
    }

    /** pos 위치에서 후보 키워드 중 단어 경계로 끝나는 첫 매칭을 반환 */
    private String matchKeyword(String sql, int pos, List<String> candidates) {
        for (String kw : candidates) {
            int end = pos + kw.length();
            if (end <= sql.length() && sql.regionMatches(pos, kw, 0, kw.length())) {
                if (end == sql.length() || !isWordChar(sql.charAt(end))) {
                    return kw;
                }
            }
        }
        return null;
    }

    /** 따옴표 밖의 대문자 키워드 토큰만 소문자로 변환 */
    private String lowercaseKeywords(String sql) {
        StringBuilder out = new StringBuilder();
        boolean inSingle = false;
        boolean inDouble = false;
        int i = 0;
        while (i < sql.length()) {
            char c = sql.charAt(i);
            if (inSingle) {
                out.append(c);
                if (c == '\'') inSingle = false;
                i++;
                continue;
            }
            if (inDouble) {
                out.append(c);
                if (c == '"') inDouble = false;
                i++;
                continue;
            }
            if (c == '\'') { inSingle = true; out.append(c); i++; continue; }
            if (c == '"') { inDouble = true; out.append(c); i++; continue; }
            if (isWordChar(c)) {
                int start = i;
                while (i < sql.length() && isWordChar(sql.charAt(i))) i++;
                String word = sql.substring(start, i);
                out.append(KEYWORDS.contains(word) ? word.toLowerCase() : word);
                continue;
            }
            out.append(c);
            i++;
        }
        return out.toString();
    }

    private boolean isWordChar(char c) {
        return Character.isLetterOrDigit(c) || c == '_';
    }
}
