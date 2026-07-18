package com.back.tool.network;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.net.spi.InetAddressResolver;
import java.net.spi.InetAddressResolverProvider;
import java.util.List;
import java.util.stream.Stream;

/**
 * JVM 전역에 등록되는 DNS 리졸버 SPI 구현(JEP 418). {@link DnsPinning}에 고정된(pin) 호스트명만
 * 가로채고, 그 외에는 전부 기본 리졸버(builtinResolver)로 위임한다 — DB 드라이버 등 다른
 * 네트워크 사용에는 아무 영향이 없다. src/main/resources/META-INF/services에 등록해야
 * JVM이 인식한다.
 */
public final class DnsPinningResolverProvider extends InetAddressResolverProvider {

    @Override
    public InetAddressResolver get(Configuration configuration) {
        InetAddressResolver builtin = configuration.builtinResolver();
        return new InetAddressResolver() {
            @Override
            public Stream<InetAddress> lookupByName(String host, LookupPolicy lookupPolicy)
                    throws UnknownHostException {
                List<InetAddress> pinned = DnsPinning.get(host);
                if (pinned != null) {
                    return pinned.stream();
                }
                return builtin.lookupByName(host, lookupPolicy);
            }

            @Override
            public String lookupByAddress(byte[] addr) throws UnknownHostException {
                return builtin.lookupByAddress(addr);
            }
        };
    }

    @Override
    public String name() {
        return "devtoolbox-dns-pinning";
    }
}
