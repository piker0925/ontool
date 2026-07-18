package com.back.tool.security;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolModule;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class VulnScanModule implements ToolModule {

    private static final Pattern GRADLE_DEP = Pattern.compile(
            "\"([^\"]+):([^\"]+):([^\"]+)\"");
    private static final Pattern MAVEN_DEP = Pattern.compile(
            "<groupId>([^<]+)</groupId>\\s*<artifactId>([^<]+)</artifactId>\\s*<version>([^<]+)</version>");

    private static final ObjectMapper JSON = new ObjectMapper();

    private final String osvBaseUrl;

    public VulnScanModule() {
        this("https://api.osv.dev");
    }

    VulnScanModule(String osvBaseUrl) {
        this.osvBaseUrl = osvBaseUrl;
    }

    @Override
    public String getId() { return "vuln-scan"; }

    @Override
    public String getName() { return "의존성 취약점 스캔"; }

    @Override
    public String getCategory() { return "security"; }

    @Override
    public boolean isHeavy() { return true; }

    @Override
    public ToolResult process(ToolInput input) {
        requireFiles(input);
        try {
            String content = Files.readString(input.files().get(0));
            String filename = input.files().get(0).getFileName().toString();
            boolean isMaven = filename.endsWith(".xml");

            List<Dependency> deps = isMaven ? parseMaven(content) : parseGradle(content);
            if (deps.isEmpty()) return ToolResult.ofText("파싱된 의존성이 없습니다.");

            HttpClient http = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(10))
                    .build();

            List<VulnRow> rows = new ArrayList<>();
            for (Dependency dep : deps) {
                String pkg = dep.groupId() + ":" + dep.artifactId();
                String body = """
                        {"version":"%s","package":{"name":"%s","ecosystem":"Maven"}}
                        """.formatted(dep.version(), pkg).strip();

                HttpRequest req = HttpRequest.newBuilder()
                        .uri(URI.create(osvBaseUrl + "/v1/query"))
                        .POST(HttpRequest.BodyPublishers.ofString(body))
                        .header("Content-Type", "application/json")
                        .timeout(Duration.ofSeconds(10))
                        .build();

                HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
                if (resp.statusCode() != 200) continue;
                rows.addAll(parseVulns(pkg, dep.version(), resp.body()));
            }

            if (rows.isEmpty()) {
                return ToolResult.ofText("스캔 대상: " + deps.size()
                        + "개 의존성\n\n✅ 스캔된 의존성에서 알려진 취약점이 없습니다.");
            }

            rows.sort(Comparator.comparingInt(r -> severityRank(r.severity())));
            return ToolResult.ofJson(Map.of(
                    "type", "table",
                    "columns", List.of("의존성", "버전", "CVE ID", "심각도", "수정 버전", "링크"),
                    "rows", rows.stream()
                            .map(r -> List.of(r.pkg(), r.version(), r.cveId(),
                                    r.severity(), r.fixed(), r.link()))
                            .toList()
            ));
        } catch (ToolProcessingException e) {
            throw e;
        } catch (Exception e) {
            throw new ToolProcessingException("취약점 스캔 실패: " + e.getMessage(), e);
        }
    }

    /** OSV /v1/query 응답의 vulns 배열에서 CVE ID·심각도·수정 버전을 추출한다. */
    private List<VulnRow> parseVulns(String pkg, String version, String responseBody) throws IOException {
        JsonNode root = JSON.readTree(responseBody);
        JsonNode vulns = root.path("vulns");
        if (!vulns.isArray() || vulns.isEmpty()) return List.of();

        List<VulnRow> rows = new ArrayList<>();
        for (JsonNode vuln : vulns) {
            String osvId = vuln.path("id").asText("");
            String cveId = cveAlias(vuln, osvId);
            String severity = severityOf(vuln);
            String fixed = fixedVersionsOf(vuln);
            String link = "https://osv.dev/vulnerability/" + osvId;
            rows.add(new VulnRow(pkg, version, cveId, severity, fixed, link));
        }
        return rows;
    }

    /** aliases에서 CVE-* 식별자를 우선 사용, 없으면 OSV id(GHSA-* 등)를 그대로 사용. */
    private String cveAlias(JsonNode vuln, String osvId) {
        if (osvId.startsWith("CVE-")) return osvId;
        for (JsonNode alias : vuln.path("aliases")) {
            String a = alias.asText("");
            if (a.startsWith("CVE-")) return a;
        }
        return osvId.isBlank() ? "-" : osvId;
    }

    /** database_specific.severity(GHSA 등급) 우선, 없으면 severity[].score(CVSS 문자열). */
    private String severityOf(JsonNode vuln) {
        String dbSeverity = vuln.path("database_specific").path("severity").asText("");
        if (!dbSeverity.isBlank()) return dbSeverity.toUpperCase();
        JsonNode severities = vuln.path("severity");
        if (severities.isArray() && !severities.isEmpty()) {
            String score = severities.get(0).path("score").asText("");
            if (!score.isBlank()) return score;
        }
        return "-";
    }

    /** affected[].ranges[].events[].fixed 값들을 중복 제거해 나열. */
    private String fixedVersionsOf(JsonNode vuln) {
        Set<String> fixed = new LinkedHashSet<>();
        for (JsonNode affected : vuln.path("affected")) {
            for (JsonNode range : affected.path("ranges")) {
                for (JsonNode event : range.path("events")) {
                    String f = event.path("fixed").asText("");
                    if (!f.isBlank()) fixed.add(f);
                }
            }
        }
        return fixed.isEmpty() ? "-" : String.join(", ", fixed);
    }

    private int severityRank(String severity) {
        return switch (severity) {
            case "CRITICAL" -> 0;
            case "HIGH" -> 1;
            case "MODERATE", "MEDIUM" -> 2;
            case "LOW" -> 3;
            default -> 4;
        };
    }

    private List<Dependency> parseGradle(String content) {
        List<Dependency> deps = new ArrayList<>();
        Matcher m = GRADLE_DEP.matcher(content);
        while (m.find()) {
            String[] parts = m.group(0).replace("\"", "").split(":");
            if (parts.length == 3) deps.add(new Dependency(parts[0], parts[1], parts[2]));
        }
        return deps;
    }

    private List<Dependency> parseMaven(String content) {
        List<Dependency> deps = new ArrayList<>();
        Matcher m = MAVEN_DEP.matcher(content);
        while (m.find()) deps.add(new Dependency(m.group(1), m.group(2), m.group(3)));
        return deps;
    }

    private record Dependency(String groupId, String artifactId, String version) {}

    private record VulnRow(String pkg, String version, String cveId,
                           String severity, String fixed, String link) {}
}
