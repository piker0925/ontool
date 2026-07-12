package com.back.tool.network;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolModule;
import com.back.tool.model.ToolParams;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.URISyntaxException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

@Component
public class UrlParserModule implements ToolModule {

    @Override
    public String getId() { return "url-parser"; }

    @Override
    public String getName() { return "URL 파서"; }

    @Override
    public String getCategory() { return "network"; }

    @Override
    public boolean isHeavy() { return false; }

    @Override
    public ToolResult process(ToolInput input) {
        String url = ToolParams.of(input).requireString("url");

        URI uri;
        try {
            uri = new URI(url.trim());
        } catch (URISyntaxException e) {
            throw new ToolProcessingException("URL 구문 오류: " + e.getReason() + " (위치: " + e.getIndex() + ")", e);
        }
        if (uri.getScheme() == null || uri.getHost() == null) {
            throw new ToolProcessingException("유효하지 않은 URL 형식입니다. 스킴과 호스트가 필요합니다 (예: https://example.com/path)");
        }

        List<Map<String, String>> items = new ArrayList<>();
        items.add(item("스킴", uri.getScheme()));

        String userInfo = uri.getUserInfo();
        if (userInfo != null) {
            int colon = userInfo.indexOf(':');
            if (colon >= 0) {
                items.add(item("사용자명", userInfo.substring(0, colon)));
                items.add(item("비밀번호", userInfo.substring(colon + 1)));
            } else {
                items.add(item("사용자명", userInfo));
            }
        }

        items.add(item("호스트", uri.getHost()));
        items.add(item("포트", uri.getPort() == -1 ? "(기본)" : String.valueOf(uri.getPort())));

        String path = uri.getPath();
        String rawPath = uri.getRawPath();
        items.add(item("경로", path == null || path.isEmpty() ? "(없음)" : path));
        if (rawPath != null && !rawPath.equals(path)) {
            items.add(item("경로 (원본)", rawPath));
        }

        String query = uri.getRawQuery();
        if (query != null && !query.isEmpty()) {
            Arrays.stream(query.split("&")).forEach(pair -> {
                int eq = pair.indexOf('=');
                String k = decode(eq >= 0 ? pair.substring(0, eq) : pair);
                String v = decode(eq >= 0 ? pair.substring(eq + 1) : "");
                items.add(item("쿼리 · " + k, v));
            });
        }

        items.add(item("프래그먼트", uri.getFragment() != null ? uri.getFragment() : "(없음)"));

        return ToolResult.ofJson(Map.of("type", "keyvalue", "items", items));
    }

    private Map<String, String> item(String key, String value) {
        return Map.of("key", key, "value", value);
    }

    private String decode(String s) {
        try {
            return URLDecoder.decode(s, StandardCharsets.UTF_8);
        } catch (Exception e) {
            return s;
        }
    }
}
