package com.back.tool.util;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolModule;
import com.back.tool.model.ToolParams;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import org.bouncycastle.crypto.digests.Blake2bDigest;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;

@Component
public class MultiHashModule implements ToolModule {

    private static final String[] JDK_ALGORITHMS = {"MD5", "SHA-1", "SHA-256", "SHA-512", "SHA3-256", "SHA3-512"};

    @Override
    public String getId() { return "multi-hash"; }

    @Override
    public String getName() { return "다중 해시"; }

    @Override
    public String getCategory() { return "util"; }

    @Override
    public boolean isHeavy() { return false; }

    @Override
    public ToolResult process(ToolInput input) {
        ToolParams params = ToolParams.of(input);
        String text = params.getString("text", "");
        boolean uppercase = params.getBool("uppercase", false);
        byte[] bytes = text.getBytes(StandardCharsets.UTF_8);

        List<Map<String, String>> items = new ArrayList<>();
        try {
            for (String algo : JDK_ALGORITHMS) {
                String hex = HexFormat.of().formatHex(MessageDigest.getInstance(algo).digest(bytes));
                items.add(Map.of("key", algo, "value", uppercase ? hex.toUpperCase() : hex));
            }
            String blake2b = HexFormat.of().formatHex(blake2b256(bytes));
            items.add(Map.of("key", "BLAKE2b-256", "value", uppercase ? blake2b.toUpperCase() : blake2b));
        } catch (Exception e) {
            throw new ToolProcessingException("해시 생성 실패: " + e.getMessage(), e);
        }
        return ToolResult.ofJson(Map.of("type", "keyvalue", "items", items));
    }

    private byte[] blake2b256(byte[] bytes) {
        Blake2bDigest digest = new Blake2bDigest(256);
        digest.update(bytes, 0, bytes.length);
        byte[] out = new byte[digest.getDigestSize()];
        digest.doFinal(out, 0);
        return out;
    }
}
