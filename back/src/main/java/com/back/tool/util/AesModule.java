package com.back.tool.util;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolModule;
import com.back.tool.model.ToolParams;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;
import java.util.HexFormat;

/**
 * AES 암호화/복호화.
 *
 * <p>암호문 인코딩 규칙 — iv 파라미터를 비우면 암호화 시 IV를 자동 생성해
 * 출력 앞부분에 포함(IV || ciphertext)하고, 복호화 시에도 앞부분을 IV로 분리한다.
 * iv 파라미터(Hex)를 직접 주면 출력/입력은 순수 ciphertext만 담는다.
 * ECB 모드는 IV를 사용하지 않는다.
 */
@Component
public class AesModule implements ToolModule {

    private static final int GCM_TAG_BITS = 128;

    private enum CipherMode {
        CBC("AES/CBC/PKCS5Padding", 16),
        GCM("AES/GCM/NoPadding", 12),
        CTR("AES/CTR/NoPadding", 16),
        ECB("AES/ECB/PKCS5Padding", 0);

        final String transformation;
        final int ivLength;

        CipherMode(String transformation, int ivLength) {
            this.transformation = transformation;
            this.ivLength = ivLength;
        }
    }

    @Override
    public String getId() { return "aes"; }

    @Override
    public String getName() { return "AES 암호화/복호화"; }

    @Override
    public String getCategory() { return "util"; }

    @Override
    public boolean isHeavy() { return false; }

    @Override
    public ToolResult process(ToolInput input) {
        ToolParams params = ToolParams.of(input);
        String text = params.getString("text", "");
        String key = params.requireString("key");
        String mode = params.getString("mode", "encrypt");
        CipherMode cipherMode = params.getEnum("cipherMode", CipherMode.class, CipherMode.CBC);
        String format = params.getString("format", "base64");
        String ivHex = params.getString("iv", "");

        byte[] keyBytes = padKey(key.getBytes(StandardCharsets.UTF_8));
        SecretKeySpec keySpec = new SecretKeySpec(keyBytes, "AES");
        byte[] userIv = parseIv(ivHex, cipherMode);

        if ("decrypt".equals(mode)) {
            return decrypt(text, keySpec, cipherMode, format, userIv);
        }
        return encrypt(text, keySpec, cipherMode, format, userIv);
    }

    private ToolResult encrypt(String text, SecretKeySpec keySpec, CipherMode cipherMode,
                               String format, byte[] userIv) {
        try {
            byte[] iv = userIv;
            if (cipherMode != CipherMode.ECB && iv == null) {
                iv = new byte[cipherMode.ivLength];
                new SecureRandom().nextBytes(iv);
            }
            Cipher cipher = Cipher.getInstance(cipherMode.transformation);
            initCipher(cipher, Cipher.ENCRYPT_MODE, keySpec, cipherMode, iv);
            byte[] encrypted = cipher.doFinal(text.getBytes(StandardCharsets.UTF_8));

            byte[] output;
            if (cipherMode == CipherMode.ECB || userIv != null) {
                output = encrypted;
            } else {
                output = new byte[iv.length + encrypted.length];
                System.arraycopy(iv, 0, output, 0, iv.length);
                System.arraycopy(encrypted, 0, output, iv.length, encrypted.length);
            }
            return ToolResult.ofText(encode(output, format));
        } catch (ToolProcessingException e) {
            throw e;
        } catch (Exception e) {
            throw new ToolProcessingException("AES 암호화 실패: " + e.getMessage(), e);
        }
    }

    private ToolResult decrypt(String text, SecretKeySpec keySpec, CipherMode cipherMode,
                               String format, byte[] userIv) {
        byte[] decoded = decode(text.strip(), format);
        byte[] iv;
        byte[] cipherText;
        if (cipherMode == CipherMode.ECB) {
            iv = null;
            cipherText = decoded;
        } else if (userIv != null) {
            iv = userIv;
            cipherText = decoded;
        } else {
            if (decoded.length < cipherMode.ivLength) {
                throw new ToolProcessingException("암호문이 너무 짧습니다. IV가 포함된 암호문인지 확인하세요.");
            }
            iv = Arrays.copyOfRange(decoded, 0, cipherMode.ivLength);
            cipherText = Arrays.copyOfRange(decoded, cipherMode.ivLength, decoded.length);
        }
        try {
            Cipher cipher = Cipher.getInstance(cipherMode.transformation);
            initCipher(cipher, Cipher.DECRYPT_MODE, keySpec, cipherMode, iv);
            return ToolResult.ofText(new String(cipher.doFinal(cipherText), StandardCharsets.UTF_8));
        } catch (Exception e) {
            throw new ToolProcessingException("복호화에 실패했습니다. 키·IV·모드·출력 형식이 암호화 시와 같은지 확인하세요.", e);
        }
    }

    private void initCipher(Cipher cipher, int opMode, SecretKeySpec keySpec,
                            CipherMode cipherMode, byte[] iv) throws Exception {
        switch (cipherMode) {
            case ECB -> cipher.init(opMode, keySpec);
            case GCM -> cipher.init(opMode, keySpec, new GCMParameterSpec(GCM_TAG_BITS, iv));
            default -> cipher.init(opMode, keySpec, new IvParameterSpec(iv));
        }
    }

    private byte[] parseIv(String ivHex, CipherMode cipherMode) {
        String stripped = ivHex.strip();
        if (stripped.isEmpty()) return null;
        if (cipherMode == CipherMode.ECB) {
            throw new ToolProcessingException("ECB 모드는 IV를 사용하지 않습니다. IV 입력을 비워주세요.");
        }
        byte[] iv;
        try {
            iv = HexFormat.of().parseHex(stripped);
        } catch (IllegalArgumentException e) {
            throw new ToolProcessingException("IV는 Hex 형식이어야 합니다. (예: 000102...0e0f)");
        }
        if (iv.length != cipherMode.ivLength) {
            throw new ToolProcessingException(
                    cipherMode.name() + " 모드의 IV는 " + cipherMode.ivLength + "바이트(" +
                            cipherMode.ivLength * 2 + " Hex 문자)여야 합니다. (입력: " + iv.length + "바이트)");
        }
        return iv;
    }

    private String encode(byte[] bytes, String format) {
        return switch (format) {
            case "base64" -> Base64.getEncoder().encodeToString(bytes);
            case "hex" -> HexFormat.of().formatHex(bytes);
            default -> throw new ToolProcessingException(
                    "지원하지 않는 출력 형식입니다: " + format + " (지원: base64, hex)");
        };
    }

    private byte[] decode(String text, String format) {
        try {
            return switch (format) {
                case "base64" -> Base64.getDecoder().decode(text);
                case "hex" -> HexFormat.of().parseHex(text);
                default -> throw new ToolProcessingException(
                        "지원하지 않는 출력 형식입니다: " + format + " (지원: base64, hex)");
            };
        } catch (IllegalArgumentException e) {
            throw new ToolProcessingException("암호문이 올바른 " + format + " 형식이 아닙니다.");
        }
    }

    private byte[] padKey(byte[] key) {
        int len = key.length <= 16 ? 16 : key.length <= 24 ? 24 : 32;
        return Arrays.copyOf(key, len);
    }
}
