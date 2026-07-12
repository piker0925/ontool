package com.back.tool.network;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolModule;
import com.back.tool.model.ToolParams;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.ConnectException;
import java.net.InetAddress;
import java.net.URI;
import java.net.UnknownHostException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

@Component
public class HtmlFetchModule implements ToolModule {

    static final int MAX_REDIRECTS = 3;
    static final int MAX_BODY_BYTES = 1024 * 1024; // 1MB

    // 리다이렉트는 수동 추적한다 — 각 홉마다 SSRF 검증을 다시 거치기 위해 자동 추적을 끈다.
    private static final HttpClient HTTP = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .followRedirects(HttpClient.Redirect.NEVER)
            .build();

    /** 테스트에서 로컬 서버 접근을 허용하기 위한 플래그. 운영 빈은 항상 false. */
    private final boolean allowPrivateAddresses;

    public HtmlFetchModule() {
        this(false);
    }

    HtmlFetchModule(boolean allowPrivateAddresses) {
        this.allowPrivateAddresses = allowPrivateAddresses;
    }

    @Override
    public String getId() { return "html-fetch"; }

    @Override
    public String getName() { return "HTML 소스 가져오기"; }

    @Override
    public String getCategory() { return "network"; }

    @Override
    public boolean isHeavy() { return false; }

    @Override
    public ToolResult process(ToolInput input) {
        String url = ToolParams.of(input).requireString("url").trim();
        URI uri = parseHttpUri(url);

        Set<String> visited = new HashSet<>();
        int redirects = 0;
        try {
            while (true) {
                validateTarget(uri);
                visited.add(uri.toString());

                HttpRequest request = HttpRequest.newBuilder()
                        .uri(uri)
                        .GET()
                        .timeout(Duration.ofSeconds(15))
                        .header("User-Agent", "DevToolbox/1.0")
                        .build();
                HttpResponse<InputStream> response = HTTP.send(request, HttpResponse.BodyHandlers.ofInputStream());
                int status = response.statusCode();

                String location = response.headers().firstValue("location").orElse(null);
                if (status >= 300 && status < 400 && location != null) {
                    try (InputStream discard = response.body()) {
                        // 리다이렉트 본문은 버린다
                    }
                    redirects++;
                    if (redirects > MAX_REDIRECTS) {
                        throw new ToolProcessingException("리다이렉트가 너무 많습니다 (최대 " + MAX_REDIRECTS + "회)");
                    }
                    URI next = parseHttpUri(uri.resolve(location).toString());
                    if (visited.contains(next.toString())) {
                        throw new ToolProcessingException("리다이렉트 루프가 감지되었습니다: " + next);
                    }
                    uri = next;
                    continue;
                }

                String contentType = response.headers().firstValue("content-type").orElse("(없음)");
                byte[] body;
                try (InputStream in = response.body()) {
                    body = readLimited(in);
                }
                String text = new String(body, charsetOf(contentType));
                return ToolResult.ofText(
                        "상태 코드: " + status + "\n" +
                        "Content-Type: " + contentType + "\n\n" +
                        text);
            }
        } catch (ToolProcessingException e) {
            throw e;
        } catch (ConnectException e) {
            throw new ToolProcessingException("연결이 거부되었습니다: " + uri.getHost(), e);
        } catch (HttpTimeoutException e) {
            throw new ToolProcessingException("요청 시간이 초과되었습니다 (15초)", e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ToolProcessingException("요청이 중단되었습니다", e);
        } catch (IOException e) {
            throw new ToolProcessingException("HTML 가져오기 실패: " + e.getMessage(), e);
        }
    }

    private URI parseHttpUri(String url) {
        URI uri;
        try {
            uri = URI.create(url);
        } catch (IllegalArgumentException e) {
            throw new ToolProcessingException("유효하지 않은 URL입니다: " + url, e);
        }
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
        if (!scheme.equals("http") && !scheme.equals("https")) {
            throw new ToolProcessingException("http/https URL만 지원합니다 (예: https://example.com)");
        }
        if (uri.getHost() == null) {
            throw new ToolProcessingException("호스트가 없는 URL입니다: " + url);
        }
        return uri;
    }

    /** SSRF 방어: 호스트를 IP로 해석해 사설/내부 대역이면 차단한다. */
    private void validateTarget(URI uri) {
        if (allowPrivateAddresses) return;
        String host = uri.getHost();
        InetAddress[] addresses;
        try {
            addresses = InetAddress.getAllByName(host);
        } catch (UnknownHostException e) {
            throw new ToolProcessingException("호스트를 찾을 수 없습니다: " + host, e);
        }
        for (InetAddress address : addresses) {
            if (isBlockedAddress(address)) {
                throw new ToolProcessingException("접근이 차단된 주소입니다 (사설/내부 IP): " + host);
            }
        }
    }

    /** 사설(RFC 1918)·루프백·링크로컬·멀티캐스트·CGNAT·IPv6 ULA 대역 여부. */
    static boolean isBlockedAddress(InetAddress address) {
        if (address.isLoopbackAddress() || address.isAnyLocalAddress()
                || address.isLinkLocalAddress() || address.isSiteLocalAddress()
                || address.isMulticastAddress()) {
            return true;
        }
        byte[] bytes = address.getAddress();
        if (bytes.length == 16 && (bytes[0] & 0xFE) == 0xFC) return true; // IPv6 ULA fc00::/7
        if (bytes.length == 4 && (bytes[0] & 0xFF) == 100 && (bytes[1] & 0xC0) == 64) return true; // 100.64.0.0/10
        return false;
    }

    private byte[] readLimited(InputStream in) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[8192];
        int total = 0;
        int read;
        while ((read = in.read(buf)) != -1) {
            total += read;
            if (total > MAX_BODY_BYTES) {
                throw new ToolProcessingException("응답이 너무 큽니다 (1MB 초과)");
            }
            out.write(buf, 0, read);
        }
        return out.toByteArray();
    }

    private Charset charsetOf(String contentType) {
        int idx = contentType.toLowerCase(Locale.ROOT).indexOf("charset=");
        if (idx < 0) return StandardCharsets.UTF_8;
        String name = contentType.substring(idx + "charset=".length()).split("[;\\s]")[0].trim();
        try {
            return Charset.forName(name);
        } catch (Exception e) {
            return StandardCharsets.UTF_8;
        }
    }
}
