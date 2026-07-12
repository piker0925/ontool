package com.back.tool.util;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolResult;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class MultiHashModuleTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private Map<String, String> hashesOf(ToolResult result) throws Exception {
        JsonNode root = MAPPER.readTree(result.textResult());
        assertThat(root.get("type").asText()).isEqualTo("keyvalue");
        Map<String, String> map = new LinkedHashMap<>();
        for (JsonNode item : root.get("items")) {
            map.put(item.get("key").asText(), item.get("value").asText());
        }
        return map;
    }

    @Test
    void returnsKeyValueJsonWithKnownHashes() throws Exception {
        MultiHashModule module = new MultiHashModule();
        ToolResult result = module.process(new ToolInput(
                List.of(), Map.of("text", "hello world")
        ));

        assertThat(result.isFile()).isFalse();
        Map<String, String> hashes = hashesOf(result);
        // 독립적으로 계산한 "hello world"의 알려진 해시값 (Python hashlib 기준).
        assertThat(hashes.get("MD5")).isEqualTo("5eb63bbbe01eeed093cb22bb8f5acdc3");
        assertThat(hashes.get("SHA-1")).isEqualTo("2aae6c35c94fcfb415dbe95f408b9ce91ee846ed");
        assertThat(hashes.get("SHA-256")).isEqualTo(
                "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9");
        assertThat(hashes.get("SHA-512")).isEqualTo(
                "309ecc489c12d6eb4cc40f50c902f2b4d0ed77ee511a7c7a9bcd3ca86d4cd86f"
                        + "989dd35bc5ff499670da34255b45b0cfd830e81f605dcf7dc5542e93ae9cd76f");
        assertThat(hashes.get("SHA3-256")).isEqualTo(
                "644bcc7e564373040999aac89e7622f3ca71fba1d972fd94a31c3bfbf24e3938");
        assertThat(hashes.get("SHA3-512")).isEqualTo(
                "840006653e9ac9e95117a15c915caab81662918e925de9e004f774ff82d7079a"
                        + "40d4d27b1b372657c61d46d470304c88c788b3a4527ad074d1dccbee5dbaa99a");
        assertThat(hashes.get("BLAKE2b-256")).isEqualTo(
                "256c83b297114d201b30179f3f0ef0cace9783622da5974326b436178aeef610");
    }

    @Test
    void uppercaseTogglesOutputCase() throws Exception {
        MultiHashModule module = new MultiHashModule();

        // uppercase=true → 대문자 Hex
        ToolResult upper = module.process(new ToolInput(
                List.of(), Map.of("text", "hello world", "uppercase", "true")
        ));
        assertThat(hashesOf(upper).get("MD5")).isEqualTo("5EB63BBBE01EEED093CB22BB8F5ACDC3");

        // uppercase=false(기본) → 소문자 Hex (항상 대문자로 뒤집는 뮤턴트를 잡는다)
        ToolResult lower = module.process(new ToolInput(
                List.of(), Map.of("text", "hello world", "uppercase", "false")
        ));
        assertThat(hashesOf(lower).get("MD5")).isEqualTo("5eb63bbbe01eeed093cb22bb8f5acdc3");
    }

    @Test
    void moduleMetadata() {
        MultiHashModule module = new MultiHashModule();
        assertThat(module.getId()).isEqualTo("multi-hash");
        assertThat(module.isHeavy()).isFalse();
    }
}
