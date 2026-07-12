package com.back.tool.util;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolModule;
import com.back.tool.model.ToolParams;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Set;

@Component
public class HmacModule implements ToolModule {

    private static final Set<String> ALLOWED_ALGORITHMS =
            Set.of("HmacSHA1", "HmacSHA256", "HmacSHA512", "HmacMD5");

    @Override
    public String getId() { return "hmac"; }

    @Override
    public String getName() { return "HMAC 서명"; }

    @Override
    public String getCategory() { return "util"; }

    @Override
    public boolean isHeavy() { return false; }

    @Override
    public ToolResult process(ToolInput input) {
        ToolParams params = ToolParams.of(input);
        String text = params.getString("text", "");
        String key = params.getString("key", "");
        String algorithm = params.getString("algorithm", "HmacSHA256");
        String format = params.getString("format", "hex");
        String keyFormat = params.getString("keyFormat", "utf8");

        if (!ALLOWED_ALGORITHMS.contains(algorithm)) {
            throw new ToolProcessingException(
                    "지원하지 않는 알고리즘입니다: " + algorithm + " (지원: HmacSHA1, HmacSHA256, HmacSHA512, HmacMD5)");
        }

        byte[] keyBytes = decodeKey(key, keyFormat);
        if (keyBytes.length == 0) {
            throw new ToolProcessingException("서명 키는 필수입니다.");
        }

        try {
            Mac mac = Mac.getInstance(algorithm);
            mac.init(new SecretKeySpec(keyBytes, algorithm));
            byte[] result = mac.doFinal(text.getBytes(StandardCharsets.UTF_8));
            return ToolResult.ofText(encode(result, format));
        } catch (Exception e) {
            throw new ToolProcessingException("HMAC 생성 실패: " + e.getMessage(), e);
        }
    }

    private byte[] decodeKey(String key, String keyFormat) {
        switch (keyFormat) {
            case "utf8":
                return key.getBytes(StandardCharsets.UTF_8);
            case "hex":
                try {
                    return HexFormat.of().parseHex(key.strip());
                } catch (IllegalArgumentException e) {
                    throw new ToolProcessingException("키가 올바른 Hex 형식이 아닙니다.");
                }
            case "base64":
                try {
                    return Base64.getDecoder().decode(key.strip());
                } catch (IllegalArgumentException e) {
                    throw new ToolProcessingException("키가 올바른 Base64 형식이 아닙니다.");
                }
            default:
                throw new ToolProcessingException(
                        "지원하지 않는 키 형식입니다: " + keyFormat + " (지원: utf8, hex, base64)");
        }
    }

    private String encode(byte[] bytes, String format) {
        switch (format) {
            case "hex":
                return HexFormat.of().formatHex(bytes);
            case "base64":
                return Base64.getEncoder().encodeToString(bytes);
            default:
                throw new ToolProcessingException(
                        "지원하지 않는 출력 형식입니다: " + format + " (지원: hex, base64)");
        }
    }
}
