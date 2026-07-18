package com.back.tool.network;

import org.junit.jupiter.api.Test;

import java.net.InetAddress;
import java.net.UnknownHostException;

import static org.assertj.core.api.Assertions.assertThat;

class DnsPinningTest {

    @Test
    void 고정된_주소를_그대로_돌려준다() throws UnknownHostException {
        InetAddress addr = InetAddress.getByName("93.184.216.34");
        DnsPinning.pin("example.pinned.test", new InetAddress[]{addr});

        assertThat(DnsPinning.get("example.pinned.test")).containsExactly(addr);
    }

    @Test
    void 호스트명_대소문자를_구분하지_않는다() throws UnknownHostException {
        InetAddress addr = InetAddress.getByName("93.184.216.34");
        DnsPinning.pin("Example.Pinned.Test", new InetAddress[]{addr});

        assertThat(DnsPinning.get("example.pinned.test")).containsExactly(addr);
    }

    @Test
    void clearThread는_현재_스레드의_고정을_모두_지운다() throws UnknownHostException {
        DnsPinning.pin("cleared.pinned.test", new InetAddress[]{InetAddress.getByName("1.1.1.1")});
        DnsPinning.clearThread();

        assertThat(DnsPinning.get("cleared.pinned.test")).isNull();
    }

    @Test
    void 고정되지_않은_호스트는_null이다() {
        assertThat(DnsPinning.get("never-pinned.test")).isNull();
    }
}
