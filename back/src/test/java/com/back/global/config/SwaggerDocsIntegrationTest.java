package com.back.global.config;

import com.back.AbstractMySQLIntegrationTest;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * springdoc-openapi가 Spring Boot 4 / Spring Framework 7 위에서 OpenAPI 문서를
 * 실제로 생성하고, Swagger UI가 그 문서를 렌더링할 수 있는지 확인한다.
 *
 * springdoc 2.8.9는 Spring Framework 6.x 대상이라 Spring Framework 7의 MVC
 * introspection API 변경과 충돌해 /v3/api-docs가 500을 낸다(098 이슈).
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("local")
class SwaggerDocsIntegrationTest extends AbstractMySQLIntegrationTest {

    @LocalServerPort
    private int port;

    private final HttpClient client = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    @Test
    void apiDocs_returnsValidOpenApiJson_notBase64() throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("http://localhost:" + port + "/v3/api-docs"))
                .timeout(Duration.ofSeconds(10))
                .GET()
                .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.headers().firstValue("Content-Type")).hasValueSatisfying(
                contentType -> assertThat(contentType).contains("application/json"));

        // 실제 파싱해서 OpenAPI 스펙 형태인지 확인한다 — springdoc/Spring Framework 조합에
        // 따라 스펙 JSON이 Base64 문자열 하나로 인코딩되어 나오는 알려진 회귀가 있었다
        // (Spring Framework 7.0.2, springdoc 3.0.0). 파싱 실패 또는 문자열 노드면 그 회귀다.
        ObjectMapper objectMapper = new ObjectMapper();
        JsonNode root = objectMapper.readTree(response.body());
        assertThat(root.isObject())
                .as("OpenAPI 문서 루트는 JSON 객체여야 한다 (Base64 문자열로 인코딩되면 안 됨)")
                .isTrue();
        assertThat(root.has("openapi")).as("OpenAPI 스펙 버전 필드가 있어야 한다").isTrue();
        assertThat(root.has("paths")).as("실제 API 경로들이 문서화되어 있어야 한다").isTrue();

        // 문서가 통째로 비어있는 "그럴듯한 200"을 잡아낸다 — 흔한 REST 엔드포인트뿐 아니라
        // 스펙 생성이 까다로울 수 있는 SseEmitter 스트림 엔드포인트(JobController#stream)까지
        // 예외 없이 문서화되는지 구체적인 경로로 확인한다.
        JsonNode paths = root.get("paths");
        assertThat(paths.fieldNames().hasNext())
                .as("최소 한 개 이상의 API 경로가 문서화되어야 한다")
                .isTrue();
        assertThat(paths.has("/api/v1/jobs/{id}")).as("일반 REST 엔드포인트가 문서화되어야 한다").isTrue();
        assertThat(paths.has("/api/v1/jobs/{id}/stream"))
                .as("SseEmitter 스트림 엔드포인트도 스펙 생성 과정에서 예외 없이 문서화되어야 한다")
                .isTrue();
    }

    @Test
    void swaggerUi_rendersHtml() throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("http://localhost:" + port + "/swagger-ui.html"))
                .timeout(Duration.ofSeconds(10))
                .GET()
                .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.body()).contains("Swagger UI");
    }
}
