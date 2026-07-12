package com.back.tool.network;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SubnetCalcModuleTest {

    private static final ObjectMapper JSON = new ObjectMapper();

    private Map<String, String> parseItems(ToolResult result) throws Exception {
        JsonNode root = JSON.readTree(result.textResult());
        assertThat(root.get("type").asText()).isEqualTo("keyvalue");
        Map<String, String> map = new LinkedHashMap<>();
        root.get("items").forEach(item -> map.put(item.get("key").asText(), item.get("value").asText()));
        return map;
    }

    @Test
    void calculatesSlash24SubnetWithExactValues() throws Exception {
        SubnetCalcModule module = new SubnetCalcModule();
        ToolResult result = module.process(new ToolInput(
                List.of(), Map.of("cidr", "192.168.1.0/24")
        ));

        assertThat(result.isFile()).isFalse();
        Map<String, String> items = parseItems(result);
        // 패턴 A: 각 필드를 독립 기준값과 정확 비교
        assertThat(items.get("네트워크 주소")).isEqualTo("192.168.1.0");
        assertThat(items.get("브로드캐스트")).isEqualTo("192.168.1.255");
        assertThat(items.get("서브넷 마스크")).isEqualTo("255.255.255.0");
        assertThat(items.get("호스트 범위")).isEqualTo("192.168.1.1 ~ 192.168.1.254");
        assertThat(items.get("사용 가능 호스트")).isEqualTo("254");
        assertThat(items.get("분류")).isEqualTo("클래스 C · Private (RFC 1918)");
    }

    @Test
    void calculatesSlash16PrivateClassA() throws Exception {
        SubnetCalcModule module = new SubnetCalcModule();
        ToolResult result = module.process(new ToolInput(
                List.of(), Map.of("cidr", "10.0.0.0/16")
        ));

        Map<String, String> items = parseItems(result);
        assertThat(items.get("네트워크 주소")).isEqualTo("10.0.0.0");
        assertThat(items.get("브로드캐스트")).isEqualTo("10.0.255.255");
        assertThat(items.get("서브넷 마스크")).isEqualTo("255.255.0.0");
        assertThat(items.get("호스트 범위")).isEqualTo("10.0.0.1 ~ 10.0.255.254");
        assertThat(items.get("사용 가능 호스트")).isEqualTo("65534");
        assertThat(items.get("분류")).isEqualTo("클래스 A · Private (RFC 1918)");
    }

    @Test
    void classifiesPublicAndSpecialRanges() throws Exception {
        SubnetCalcModule module = new SubnetCalcModule();
        // 패턴 B: 특수 대역에 해당하지 않는 공인 IP는 Public으로 남아야 한다
        assertThat(parseItems(module.process(cidr("8.8.8.0/24"))).get("분류"))
                .isEqualTo("클래스 A · Public");
        assertThat(parseItems(module.process(cidr("203.0.113.0/24"))).get("분류"))
                .isEqualTo("클래스 C · Public");
        assertThat(parseItems(module.process(cidr("127.0.0.0/8"))).get("분류"))
                .isEqualTo("클래스 A · Loopback (127.0.0.0/8)");
        assertThat(parseItems(module.process(cidr("172.16.0.0/12"))).get("분류"))
                .isEqualTo("클래스 B · Private (RFC 1918)");
        // 172.32.x는 RFC 1918 범위(172.16~172.31) 밖 — Public이어야 한다
        assertThat(parseItems(module.process(cidr("172.32.0.0/16"))).get("분류"))
                .isEqualTo("클래스 B · Public");
        assertThat(parseItems(module.process(cidr("169.254.0.0/16"))).get("분류"))
                .isEqualTo("클래스 B · Link-local (RFC 3927)");
        assertThat(parseItems(module.process(cidr("224.0.0.0/4"))).get("분류"))
                .isEqualTo("클래스 D · Multicast");
        assertThat(parseItems(module.process(cidr("240.0.0.0/4"))).get("분류"))
                .isEqualTo("클래스 E · 예약됨 (240.0.0.0/4)");
    }

    @Test
    void slash31HasZeroUsableHostsAndNoRange() throws Exception {
        SubnetCalcModule module = new SubnetCalcModule();
        ToolResult result = module.process(new ToolInput(
                List.of(), Map.of("cidr", "192.168.1.0/31")
        ));

        Map<String, String> items = parseItems(result);
        assertThat(items.get("서브넷 마스크")).isEqualTo("255.255.255.254");
        assertThat(items.get("사용 가능 호스트")).isEqualTo("0");
        assertThat(items.get("호스트 범위")).isEqualTo("(없음)");
    }

    @Test
    void rejectsInvalidInput() {
        SubnetCalcModule module = new SubnetCalcModule();
        assertThatThrownBy(() -> module.process(cidr("192.168.1.0")))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("CIDR 형식");
        assertThatThrownBy(() -> module.process(cidr("192.168.1.0/33")))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("prefix");
        assertThatThrownBy(() -> module.process(cidr("192.168.1.256/24")))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("옥텟");
    }

    private ToolInput cidr(String value) {
        return new ToolInput(List.of(), Map.of("cidr", value));
    }

    @Test
    void moduleMetadata() {
        SubnetCalcModule module = new SubnetCalcModule();
        assertThat(module.getId()).isEqualTo("subnet-calc");
        assertThat(module.isHeavy()).isFalse();
        assertThat(module.getCategory()).isEqualTo("network");
    }
}
