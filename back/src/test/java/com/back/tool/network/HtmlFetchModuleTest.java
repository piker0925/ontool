package com.back.tool.network;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class HtmlFetchModuleTest {

    private static final String HTML = "<html><body>Hello</body></html>";

    private HttpServer server;
    private int port;

    @BeforeEach
    void startServer() throws Exception {
        server = HttpServer.create(new InetSocketAddress(0), 0);
        port = server.getAddress().getPort();

        server.createContext("/", exchange -> {
            byte[] body = HTML.getBytes();
            exchange.getResponseHeaders().set("Content-Type", "text/html; charset=utf-8");
            exchange.sendResponseHeaders(200, body.length);
            exchange.getResponseBody().write(body);
            exchange.getResponseBody().close();
        });
        // 3회 리다이렉트 체인: /r3 -> /r2 -> /r1 -> /
        for (int i = 1; i <= 4; i++) {
            String target = i == 1 ? "/" : "/r" + (i - 1);
            String path = "/r" + i;
            server.createContext(path, exchange -> {
                exchange.getResponseHeaders().set("Location", target);
                exchange.sendResponseHeaders(302, -1);
                exchange.close();
            });
        }
        server.createContext("/loop", exchange -> {
            exchange.getResponseHeaders().set("Location", "/loop");
            exchange.sendResponseHeaders(302, -1);
            exchange.close();
        });
        server.createContext("/big", exchange -> {
            byte[] body = new byte[HtmlFetchModule.MAX_BODY_BYTES + 1];
            Arrays.fill(body, (byte) 'a');
            exchange.sendResponseHeaders(200, body.length);
            exchange.getResponseBody().write(body);
            exchange.getResponseBody().close();
        });
        server.start();
    }

    @AfterEach
    void stopServer() {
        server.stop(0);
    }

    private ToolInput urlInput(String path) {
        return new ToolInput(List.of(), Map.of("url", "http://localhost:" + port + path));
    }

    /** 테스트용: 로컬 서버 접근을 허용한 모듈 */
    private HtmlFetchModule localModule() {
        return new HtmlFetchModule(true);
    }

    @Test
    void fetchesHtmlWithStatusAndContentTypeHeader() {
        ToolResult result = localModule().process(urlInput("/"));

        assertThat(result.isFile()).isFalse();
        // 패턴 A: 상단 메타 2줄 + 빈 줄 + 본문 전체를 기준값과 정확 비교
        assertThat(result.textResult()).isEqualTo(
                "상태 코드: 200\n" +
                "Content-Type: text/html; charset=utf-8\n\n" +
                HTML);
    }

    @Test
    void followsUpToThreeRedirects() {
        // /r3 -> /r2 -> /r1 -> / : 정확히 3회 리다이렉트는 허용
        ToolResult result = localModule().process(urlInput("/r3"));

        assertThat(result.textResult()).startsWith("상태 코드: 200");
        assertThat(result.textResult()).endsWith(HTML);
    }

    @Test
    void rejectsMoreThanThreeRedirects() {
        // /r4 -> /r3 -> /r2 -> /r1 -> / : 4회째에서 차단
        assertThatThrownBy(() -> localModule().process(urlInput("/r4")))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("리다이렉트가 너무 많습니다");
    }

    @Test
    void detectsRedirectLoop() {
        assertThatThrownBy(() -> localModule().process(urlInput("/loop")))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("리다이렉트");
    }

    @Test
    void rejectsBodyOverOneMegabyte() {
        // 패턴 B: 1MB 이하(/)는 통과, 1MB 초과(/big)는 차단
        assertThatThrownBy(() -> localModule().process(urlInput("/big")))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("응답이 너무 큽니다");
    }

    @Test
    void ssrfBlocksLoopbackAndPrivateTargets() {
        HtmlFetchModule module = new HtmlFetchModule(); // 운영 기본값: 차단 활성
        // 패턴 B(차단 측): 루프백/사설 대역은 요청 전에 거부된다
        assertThatThrownBy(() -> module.process(new ToolInput(List.of(),
                Map.of("url", "http://127.0.0.1:" + port + "/"))))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("차단된 주소");
        assertThatThrownBy(() -> module.process(new ToolInput(List.of(),
                Map.of("url", "http://localhost:" + port + "/"))))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("차단된 주소");
        assertThatThrownBy(() -> module.process(new ToolInput(List.of(),
                Map.of("url", "http://10.1.2.3/"))))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("차단된 주소");
    }

    @Test
    void ssrfAddressClassification() throws Exception {
        // 패턴 B(허용 측): 공인 IP는 차단 로직을 통과한다 (리터럴 IP라 DNS 조회 없음)
        assertThat(HtmlFetchModule.isBlockedAddress(InetAddress.getByName("8.8.8.8"))).isFalse();
        assertThat(HtmlFetchModule.isBlockedAddress(InetAddress.getByName("93.184.216.34"))).isFalse();
        assertThat(HtmlFetchModule.isBlockedAddress(InetAddress.getByName("2606:4700:4700::1111"))).isFalse();

        // 차단 측: 사설/루프백/링크로컬/CGNAT/IPv6 ULA
        assertThat(HtmlFetchModule.isBlockedAddress(InetAddress.getByName("127.0.0.1"))).isTrue();
        assertThat(HtmlFetchModule.isBlockedAddress(InetAddress.getByName("10.0.0.5"))).isTrue();
        assertThat(HtmlFetchModule.isBlockedAddress(InetAddress.getByName("172.16.0.1"))).isTrue();
        assertThat(HtmlFetchModule.isBlockedAddress(InetAddress.getByName("192.168.1.1"))).isTrue();
        assertThat(HtmlFetchModule.isBlockedAddress(InetAddress.getByName("169.254.1.1"))).isTrue();
        assertThat(HtmlFetchModule.isBlockedAddress(InetAddress.getByName("0.0.0.0"))).isTrue();
        assertThat(HtmlFetchModule.isBlockedAddress(InetAddress.getByName("100.64.0.1"))).isTrue();
        assertThat(HtmlFetchModule.isBlockedAddress(InetAddress.getByName("::1"))).isTrue();
        assertThat(HtmlFetchModule.isBlockedAddress(InetAddress.getByName("fd00::1"))).isTrue();
    }

    @Test
    void rejectsUnresolvableHost() {
        // RFC 2606 예약 TLD(.invalid)라 실제 네트워크 환경과 무관하게 항상 DNS 해석에 실패한다.
        // SSRF 방어가 "해석 실패 시 진행"이 아니라 "거부"로 fail-closed인지 검증한다.
        assertThatThrownBy(() -> localModule().process(new ToolInput(List.of(),
                Map.of("url", "http://dns-pinning-fetch-test.invalid/"))))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("호스트를 찾을 수 없습니다");
    }

    @Test
    void rejectsNonHttpScheme() {
        assertThatThrownBy(() -> localModule().process(new ToolInput(List.of(),
                Map.of("url", "file:///etc/passwd"))))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("http/https");
    }

    @Test
    void 요청_처리후에는_고정된_DNS항목이_남지_않는다() {
        // DNS 리바인딩 방지용 고정이 스레드에 계속 남으면, 스레드 풀에서 재사용될 다음 요청이
        // (다른 호스트라도) 엉뚱하게 이 고정을 참조할 수 있다. finally에서 정리되는지 확인.
        localModule().process(urlInput("/"));

        assertThat(DnsPinning.get("localhost")).isNull();
    }

    @Test
    void 검증후_고정은_되었지만_이후_단계에서_실패로_끝나도_고정이_남지_않는다() {
        // validateTarget에서 고정까지는 성공하고(allowPrivateAddresses로 차단 검사만 생략) 이후
        // 응답 크기 초과로 실패하는 경우 — 성공 경로만 finally를 타면 스레드 풀 재사용 시
        // 다음 요청에 이 고정이 새어나간다.
        assertThatThrownBy(() -> localModule().process(urlInput("/big")))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("응답이 너무 큽니다");

        assertThat(DnsPinning.get("localhost")).isNull();
    }

    @Test
    void moduleMetadata() {
        HtmlFetchModule module = new HtmlFetchModule();
        assertThat(module.getId()).isEqualTo("html-fetch");
        assertThat(module.isHeavy()).isFalse();
        assertThat(module.getCategory()).isEqualTo("network");
    }
}
