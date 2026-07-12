package com.back.tool.network;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolModule;
import com.back.tool.model.ToolParams;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
public class SubnetCalcModule implements ToolModule {

    @Override
    public String getId() { return "subnet-calc"; }

    @Override
    public String getName() { return "서브넷 계산기"; }

    @Override
    public String getCategory() { return "network"; }

    @Override
    public boolean isHeavy() { return false; }

    @Override
    public ToolResult process(ToolInput input) {
        String cidr = ToolParams.of(input).requireString("cidr");
        try {
            String[] parts = cidr.split("/");
            if (parts.length != 2) throw new IllegalArgumentException("CIDR 형식이 아닙니다 (예: 192.168.1.0/24): " + cidr);

            long ip = ipToLong(parts[0]);
            int prefix = Integer.parseInt(parts[1].trim());
            if (prefix < 0 || prefix > 32) throw new IllegalArgumentException("prefix 범위 오류: " + prefix + " (0~32만 가능)");

            long mask = prefix == 0 ? 0L : (0xFFFFFFFFL << (32 - prefix)) & 0xFFFFFFFFL;
            long network = ip & mask;
            long broadcast = network | (~mask & 0xFFFFFFFFL);
            long hosts = prefix >= 31 ? 0 : broadcast - network - 1;
            String hostRange = prefix >= 31
                    ? "(없음)"
                    : longToIp(network + 1) + " ~ " + longToIp(broadcast - 1);

            return ToolResult.ofJson(Map.of("type", "keyvalue", "items", List.of(
                    item("네트워크 주소", longToIp(network)),
                    item("브로드캐스트", longToIp(broadcast)),
                    item("서브넷 마스크", longToIp(mask)),
                    item("호스트 범위", hostRange),
                    item("사용 가능 호스트", String.valueOf(hosts)),
                    item("분류", classify(network))
            )));
        } catch (IllegalArgumentException e) {
            throw new ToolProcessingException(e.getMessage(), e);
        }
    }

    private Map<String, String> item(String key, String value) {
        return Map.of("key", key, "value", value);
    }

    /**
     * 네트워크 주소 기준 클래스(A~E)와 특수 대역(Private/Loopback/Link-local 등)을 판정한다.
     */
    private String classify(long network) {
        int firstOctet = (int) ((network >> 24) & 0xFF);
        String clazz;
        if (firstOctet <= 127) clazz = "클래스 A";
        else if (firstOctet <= 191) clazz = "클래스 B";
        else if (firstOctet <= 223) clazz = "클래스 C";
        else if (firstOctet <= 239) clazz = "클래스 D";
        else clazz = "클래스 E";

        String special;
        if (firstOctet == 0) special = "예약됨 (0.0.0.0/8)";
        else if (firstOctet == 127) special = "Loopback (127.0.0.0/8)";
        else if (firstOctet == 10) special = "Private (RFC 1918)";
        else if (firstOctet == 172 && ((network >> 16) & 0xF0) == 16) special = "Private (RFC 1918)";
        else if (firstOctet == 192 && ((network >> 16) & 0xFF) == 168) special = "Private (RFC 1918)";
        else if (firstOctet == 169 && ((network >> 16) & 0xFF) == 254) special = "Link-local (RFC 3927)";
        else if (firstOctet >= 224 && firstOctet <= 239) special = "Multicast";
        else if (firstOctet >= 240) special = "예약됨 (240.0.0.0/4)";
        else special = "Public";

        return clazz + " · " + special;
    }

    private long ipToLong(String ip) {
        String[] octs = ip.trim().split("\\.");
        if (octs.length != 4) throw new IllegalArgumentException("잘못된 IP 주소: " + ip);
        long result = 0;
        for (String oct : octs) {
            int val = Integer.parseInt(oct);
            if (val < 0 || val > 255) throw new IllegalArgumentException("옥텟 범위 오류: " + val + " (0~255만 가능)");
            result = (result << 8) | val;
        }
        return result;
    }

    private String longToIp(long ip) {
        return ((ip >> 24) & 0xFF) + "." + ((ip >> 16) & 0xFF) + "." + ((ip >> 8) & 0xFF) + "." + (ip & 0xFF);
    }
}
