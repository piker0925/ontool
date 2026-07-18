package com.back.tool.network;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.net.InetAddress;
import java.net.UnknownHostException;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * DnsPinningResolverProvider가 JVM의 InetAddress 해석 경로에 실제로 끼어드는지 확인한다.
 * "localhost"는 JDK가 리졸버 SPI를 거치지 않고 지름길로 처리하므로 검증에 쓸 수 없다 — 대신
 * RFC 2606 예약 TLD(.invalid)라 실제로는 절대 해석될 수 없는 호스트명을 쓴다. 고정 후 조회가
 * "고정한 그 주소로" 성공한다면(리터럴 IP만 다뤄 네트워크 조회 자체가 없음), InetAddress의
 * 이름 해석 경로가 실제로 이 리졸버를 거친다는 뜻이다. HttpClient의 실제 연결도 같은
 * InetAddress 경로를 타므로, 이 결과는 곧 DNS 리바인딩 방지가 실제 연결에도 적용됨을
 * 보장하는 근거다.
 */
class DnsPinningResolverProviderTest {

    private static final String UNROUTABLE_HOST = "dns-pinning-provider-test.invalid";
    // TEST-NET-3(RFC 5737) 문서용 예약 대역 — 리터럴 IP라 이 주소를 만드는 데 네트워크 조회가 없다.
    private static final String DECOY_IP = "203.0.113.7";

    @AfterEach
    void clear() {
        DnsPinning.clearThread();
    }

    @Test
    void 고정된_호스트는_실제_DNS질의_없이_고정된_주소로_해석된다() throws UnknownHostException {
        InetAddress decoy = InetAddress.getByName(DECOY_IP);

        DnsPinning.pin(UNROUTABLE_HOST, new InetAddress[]{decoy});
        InetAddress[] resolved = InetAddress.getAllByName(UNROUTABLE_HOST);

        assertThat(resolved).containsExactly(decoy);
    }
}
