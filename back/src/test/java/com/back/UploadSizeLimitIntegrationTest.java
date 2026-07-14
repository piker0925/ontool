package com.back;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 실제 Tomcat을 통과하는 업로드 한도 검증 (RANDOM_PORT + JDK HttpClient). MockMvc는 서블릿 컨테이너의
 * multipart 크기 제한을 우회하므로 이 경로(멀티파트 해석 → MaxUploadSizeExceededException → 413 JSON)는
 * 실 HTTP로만 검증된다. 한도를 512KB로 낮추고 3MB를 보낸다. 초과분(~2.5MB)이 기본 max-swallow-size(2MB)를
 * 넘어, server.tomcat.max-swallow-size=-1 이 없으면 연결이 리셋되어 빈 바디가 되는 조건을 재현한다.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("local")
@TestPropertySource(properties = {
        "storage.upload-dir=build/test-uploads",
        "spring.servlet.multipart.max-file-size=512KB",
        "spring.servlet.multipart.max-request-size=512KB"
})
class UploadSizeLimitIntegrationTest extends AbstractMySQLIntegrationTest {

    @LocalServerPort
    int port;

    @Test
    void oversizedUpload_returns413WithJsonBody() throws Exception {
        String boundary = "----dtkBoundary";
        byte[] body = multipartBody(boundary, "files", "big.bin", new byte[3 * 1024 * 1024]);

        HttpResponse<String> response = HttpClient.newHttpClient().send(
                HttpRequest.newBuilder()
                        .uri(URI.create("http://localhost:" + port + "/api/v1/tools/image-to-pdf/upload"))
                        .header("Content-Type", "multipart/form-data; boundary=" + boundary)
                        // 크로스 오리진(프론트 5173 → 백엔드 8080). multipart 해석 단계에서 던져지는 413이라도
                        // CORS 헤더가 없으면 브라우저가 응답을 가려 프론트가 사유를 못 읽는다(과거 CORS 버그 클래스).
                        .header("Origin", "http://localhost:5173")
                        .POST(HttpRequest.BodyPublishers.ofByteArray(body))
                        .build(),
                HttpResponse.BodyHandlers.ofString());

        // 413 + 비어 있지 않은 JSON 바디 (연결 리셋/빈 바디가 아님)
        assertThat(response.statusCode()).isEqualTo(413);
        assertThat(response.body()).isNotBlank();
        assertThat(response.body()).contains("FILE_TOO_LARGE");
        // 브라우저가 413 바디를 읽을 수 있도록 CORS 허용 헤더가 조기 예외 응답에도 실려야 한다.
        assertThat(response.headers().firstValue("Access-Control-Allow-Origin"))
                .contains("http://localhost:5173");
    }

    private static byte[] multipartBody(String boundary, String name, String filename, byte[] content) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        String header = "--" + boundary + "\r\n"
                + "Content-Disposition: form-data; name=\"" + name + "\"; filename=\"" + filename + "\"\r\n"
                + "Content-Type: application/octet-stream\r\n\r\n";
        out.write(header.getBytes(StandardCharsets.UTF_8));
        out.write(content);
        out.write(("\r\n--" + boundary + "--\r\n").getBytes(StandardCharsets.UTF_8));
        return out.toByteArray();
    }
}
