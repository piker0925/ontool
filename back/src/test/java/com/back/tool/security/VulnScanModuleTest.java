package com.back.tool.security;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.net.InetSocketAddress;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class VulnScanModuleTest {

    private static final ObjectMapper JSON = new ObjectMapper();

    /** log4j-core 2.14.1에 대한 OSV 응답 축약본 (Log4Shell). */
    private static final String LOG4SHELL_RESPONSE = """
            {"vulns":[{
              "id":"GHSA-jfh8-c2jp-5v3q",
              "summary":"Remote code injection in Log4j",
              "aliases":["CVE-2021-44228"],
              "severity":[{"type":"CVSS_V3","score":"CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H"}],
              "database_specific":{"severity":"CRITICAL"},
              "affected":[{
                "package":{"ecosystem":"Maven","name":"org.apache.logging.log4j:log4j-core"},
                "ranges":[{"type":"ECOSYSTEM","events":[{"introduced":"2.0-beta9"},{"fixed":"2.3.1"},{"introduced":"2.4"},{"fixed":"2.15.0"}]}]
              }]
            }]}
            """;

    @TempDir
    Path tempDir;

    HttpServer server;
    String baseUrl;

    @BeforeEach
    void startServer() throws Exception {
        server = HttpServer.create(new InetSocketAddress(0), 0);
        int port = server.getAddress().getPort();
        baseUrl = "http://localhost:" + port;
    }

    @AfterEach
    void stopServer() {
        server.stop(0);
    }

    private static JsonNode parseTable(ToolResult result) throws Exception {
        JsonNode root = JSON.readTree(result.textResult());
        assertThat(root.path("type").asText()).isEqualTo("table");
        return root;
    }

    private static List<List<String>> rowsOf(JsonNode table) {
        List<List<String>> rows = new ArrayList<>();
        for (JsonNode row : table.path("rows")) {
            List<String> cells = new ArrayList<>();
            row.forEach(c -> cells.add(c.asText()));
            rows.add(cells);
        }
        return rows;
    }

    @Test
    void vulnerableDependencyProducesStructuredTableRow() throws Exception {
        server.createContext("/v1/query", exchange -> {
            byte[] body = LOG4SHELL_RESPONSE.getBytes();
            exchange.sendResponseHeaders(200, body.length);
            exchange.getResponseBody().write(body);
            exchange.getResponseBody().close();
        });
        server.start();

        Path gradle = tempDir.resolve("build.gradle");
        Files.writeString(gradle, """
                dependencies {
                    implementation("org.apache.logging.log4j:log4j-core:2.14.1")
                }
                """);

        VulnScanModule module = new VulnScanModule(baseUrl);
        ToolResult result = module.process(new ToolInput(List.of(gradle), Map.of()));

        assertThat(result.isFile()).isFalse();
        JsonNode table = parseTable(result);

        List<String> columns = new ArrayList<>();
        table.path("columns").forEach(c -> columns.add(c.asText()));
        assertThat(columns).containsExactly("의존성", "버전", "CVE ID", "심각도", "수정 버전", "링크");

        // 패턴 A: OSV 응답에서 추출한 각 필드가 정확한 값으로 행에 들어가야 한다.
        assertThat(rowsOf(table)).containsExactly(List.of(
                "org.apache.logging.log4j:log4j-core",
                "2.14.1",
                "CVE-2021-44228",
                "CRITICAL",
                "2.3.1, 2.15.0",
                "https://osv.dev/vulnerability/GHSA-jfh8-c2jp-5v3q"
        ));
    }

    @Test
    void onlyVulnerableDependencyAppearsInTable() throws Exception {
        // 패턴 B: 취약 의존성과 안전한 의존성을 함께 스캔 —
        // "전부 취약"으로 뭉개는 구현과 "취약한 것만" 정확히 보고하는 구현을 구분한다.
        server.createContext("/v1/query", exchange -> {
            String reqBody = new String(exchange.getRequestBody().readAllBytes());
            byte[] body = reqBody.contains("log4j-core")
                    ? LOG4SHELL_RESPONSE.getBytes()
                    : "{}".getBytes();
            exchange.sendResponseHeaders(200, body.length);
            exchange.getResponseBody().write(body);
            exchange.getResponseBody().close();
        });
        server.start();

        Path gradle = tempDir.resolve("build.gradle");
        Files.writeString(gradle, """
                dependencies {
                    implementation("org.apache.logging.log4j:log4j-core:2.14.1")
                    implementation("com.example:safe-lib:1.0.0")
                }
                """);

        VulnScanModule module = new VulnScanModule(baseUrl);
        ToolResult result = module.process(new ToolInput(List.of(gradle), Map.of()));

        List<List<String>> rows = rowsOf(parseTable(result));
        assertThat(rows).hasSize(1);
        assertThat(rows.get(0).get(0)).isEqualTo("org.apache.logging.log4j:log4j-core");
        assertThat(rows.get(0).get(2)).isEqualTo("CVE-2021-44228");
        assertThat(result.textResult()).doesNotContain("safe-lib");
    }

    @Test
    void fallsBackToOsvIdAndDashWhenOptionalFieldsMissing() throws Exception {
        // aliases/severity/fixed가 없는 취약점 — CVE ID는 OSV id로, 나머지는 '-'로 채워야 한다.
        server.createContext("/v1/query", exchange -> {
            byte[] body = "{\"vulns\":[{\"id\":\"GHSA-xxxx-yyyy-zzzz\"}]}".getBytes();
            exchange.sendResponseHeaders(200, body.length);
            exchange.getResponseBody().write(body);
            exchange.getResponseBody().close();
        });
        server.start();

        Path gradle = tempDir.resolve("build.gradle");
        Files.writeString(gradle, """
                dependencies {
                    implementation("log4j:log4j:1.2.17")
                }
                """);

        VulnScanModule module = new VulnScanModule(baseUrl);
        ToolResult result = module.process(new ToolInput(List.of(gradle), Map.of()));

        assertThat(rowsOf(parseTable(result))).containsExactly(List.of(
                "log4j:log4j",
                "1.2.17",
                "GHSA-xxxx-yyyy-zzzz",
                "-",
                "-",
                "https://osv.dev/vulnerability/GHSA-xxxx-yyyy-zzzz"
        ));
    }

    @Test
    void sortsRowsBySeverity() throws Exception {
        // 심각도 낮은 취약점이 먼저 응답돼도 결과는 CRITICAL이 먼저 와야 한다.
        server.createContext("/v1/query", exchange -> {
            byte[] body = """
                    {"vulns":[
                      {"id":"GHSA-low1","aliases":["CVE-2020-0001"],"database_specific":{"severity":"LOW"}},
                      {"id":"GHSA-crit1","aliases":["CVE-2020-0002"],"database_specific":{"severity":"CRITICAL"}}
                    ]}
                    """.getBytes();
            exchange.sendResponseHeaders(200, body.length);
            exchange.getResponseBody().write(body);
            exchange.getResponseBody().close();
        });
        server.start();

        Path gradle = tempDir.resolve("build.gradle");
        Files.writeString(gradle, """
                dependencies {
                    implementation("com.example:lib:1.0.0")
                }
                """);

        VulnScanModule module = new VulnScanModule(baseUrl);
        ToolResult result = module.process(new ToolInput(List.of(gradle), Map.of()));

        List<List<String>> rows = rowsOf(parseTable(result));
        assertThat(rows).hasSize(2);
        assertThat(rows.get(0).get(2)).isEqualTo("CVE-2020-0002"); // CRITICAL 먼저
        assertThat(rows.get(1).get(2)).isEqualTo("CVE-2020-0001"); // LOW 나중
    }

    @Test
    void reportsCleanWhenOsvReturnsNoVulnerabilities() throws Exception {
        server.createContext("/v1/query", exchange -> {
            byte[] body = "{}".getBytes();
            exchange.sendResponseHeaders(200, body.length);
            exchange.getResponseBody().write(body);
            exchange.getResponseBody().close();
        });
        server.start();

        Path gradle = tempDir.resolve("build.gradle");
        Files.writeString(gradle, """
                dependencies {
                    implementation("com.example:safe-lib:1.0.0")
                }
                """);

        VulnScanModule module = new VulnScanModule(baseUrl);
        ToolResult result = module.process(new ToolInput(List.of(gradle), Map.of()));

        assertThat(result.textResult())
                .contains("스캔 대상: 1개")
                .contains("취약점이 없습니다")
                .doesNotContain("\"type\"");
    }

    @Test
    void returnsEarlyWhenNoDependenciesParsed() throws Exception {
        server.start();

        Path gradle = tempDir.resolve("build.gradle");
        Files.writeString(gradle, "// 의존성 없음");

        VulnScanModule module = new VulnScanModule(baseUrl);
        ToolResult result = module.process(new ToolInput(List.of(gradle), Map.of()));

        assertThat(result.textResult()).contains("파싱된 의존성이 없습니다");
    }

    @Test
    void parsesMavenPomFile() throws Exception {
        server.createContext("/v1/query", exchange -> {
            byte[] body = "{}".getBytes();
            exchange.sendResponseHeaders(200, body.length);
            exchange.getResponseBody().write(body);
            exchange.getResponseBody().close();
        });
        server.start();

        Path pom = tempDir.resolve("pom.xml");
        Files.writeString(pom, """
                <dependencies>
                  <dependency>
                    <groupId>org.apache.commons</groupId>
                    <artifactId>commons-lang3</artifactId>
                    <version>3.12.0</version>
                  </dependency>
                  <dependency>
                    <groupId>com.google.guava</groupId>
                    <artifactId>guava</artifactId>
                    <version>32.1.0</version>
                  </dependency>
                </dependencies>
                """);

        VulnScanModule module = new VulnScanModule(baseUrl);
        ToolResult result = module.process(new ToolInput(List.of(pom), Map.of()));

        assertThat(result.isFile()).isFalse();
        assertThat(result.textResult()).contains("스캔 대상: 2개");
    }

    @Test
    void 파일_0개면_ToolProcessingException을_던진다() {
        VulnScanModule module = new VulnScanModule();
        assertThatThrownBy(() -> module.process(new ToolInput(List.of(), Map.of())))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("처리할 파일이 없습니다");
    }

    @Test
    void moduleMetadata() {
        VulnScanModule module = new VulnScanModule();
        assertThat(module.getId()).isEqualTo("vuln-scan");
        assertThat(module.isHeavy()).isTrue();
        assertThat(module.getCategory()).isEqualTo("security");
    }
}
