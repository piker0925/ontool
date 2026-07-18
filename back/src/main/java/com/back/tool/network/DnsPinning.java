package com.back.tool.network;

import java.net.InetAddress;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * SSRF 방어의 DNS 리바인딩 TOCTOU 구멍을 막기 위한 스레드 국소 DNS 고정.
 * validateTarget()이 검증에 쓴 주소를 여기에 고정해두면, 바로 뒤 실제 연결이 같은 호스트명을
 * 다시 조회할 때(HttpClient 내부) {@link DnsPinningResolverProvider}가 새 DNS 질의 대신 이
 * 값을 그대로 돌려준다 — 공격자가 두 조회 사이에 응답을 내부 IP로 바꿔치기할 창을 없앤다.
 * 스레드 국소이므로 다른 요청·다른 네트워크 사용(DB 드라이버 등)에는 영향이 없다.
 */
final class DnsPinning {

    private static final ThreadLocal<Map<String, List<InetAddress>>> PINS =
            ThreadLocal.withInitial(HashMap::new);

    private DnsPinning() {}

    static void pin(String host, InetAddress[] addresses) {
        PINS.get().put(key(host), List.of(addresses));
    }

    static List<InetAddress> get(String host) {
        return PINS.get().get(key(host));
    }

    static void clearThread() {
        PINS.get().clear();
    }

    private static String key(String host) {
        return host.toLowerCase(Locale.ROOT);
    }
}
