package com.back.tool.util;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AesModuleTest {

    private static final String KEY = "0123456789abcdef"; // 16바이트 → AES-128
    private static final String FIXED_IV_16 = "000102030405060708090a0b0c0d0e0f";
    private static final String FIXED_IV_12 = "000102030405060708090a0b";

    private final AesModule module = new AesModule();

    private ToolResult run(Map<String, String> params) {
        return module.process(new ToolInput(List.of(), new HashMap<>(params)));
    }

    @Test
    void encryptThenDecryptMatchesOriginal() {
        String plaintext = "hello world";
        String key = "mysecretkey12345";

        ToolResult encrypted = run(Map.of("text", plaintext, "key", key, "mode", "encrypt"));
        assertThat(encrypted.isFile()).isFalse();
        assertThat(encrypted.textResult()).isNotEqualTo(plaintext);

        ToolResult decrypted = run(Map.of("text", encrypted.textResult(), "key", key, "mode", "decrypt"));
        assertThat(decrypted.textResult()).isEqualTo(plaintext);
    }

    @Test
    void cbcWithExplicitIvMatchesIndependentReference() {
        // AES-128-CBC/PKCS5, key="0123456789abcdef", IV=000102..0e0f, pt="hello world"
        // 기준값은 독립 구현(순수 Python AES, NIST 벡터로 검증)으로 계산.
        ToolResult encrypted = run(Map.of(
                "text", "hello world", "key", KEY, "mode", "encrypt",
                "cipherMode", "CBC", "iv", FIXED_IV_16));
        assertThat(encrypted.textResult()).isEqualTo("OQaYvr78d5eogNH32Thzqw==");

        // IV를 직접 준 경우 출력은 순수 암호문 → 복호화 때도 같은 IV를 줘야 한다
        ToolResult decrypted = run(Map.of(
                "text", "OQaYvr78d5eogNH32Thzqw==", "key", KEY, "mode", "decrypt",
                "cipherMode", "CBC", "iv", FIXED_IV_16));
        assertThat(decrypted.textResult()).isEqualTo("hello world");
    }

    @Test
    void hexOutputFormatMatchesIndependentReference() {
        ToolResult encrypted = run(Map.of(
                "text", "hello world", "key", KEY, "mode", "encrypt",
                "cipherMode", "CBC", "iv", FIXED_IV_16, "format", "hex"));
        // 같은 암호문의 Hex 인코딩 (독립 계산값) — format 파라미터 무시 뮤턴트를 잡는다
        assertThat(encrypted.textResult()).isEqualTo("390698bebefc7797a880d1f7d93873ab");

        ToolResult decrypted = run(Map.of(
                "text", "390698bebefc7797a880d1f7d93873ab", "key", KEY, "mode", "decrypt",
                "cipherMode", "CBC", "iv", FIXED_IV_16, "format", "hex"));
        assertThat(decrypted.textResult()).isEqualTo("hello world");
    }

    @Test
    void gcmRoundTripAndCiphertextMatchesCtrConstruction() {
        // GCM 라운드트립 + 암호문이 평문과 다른지 확인
        ToolResult encrypted = run(Map.of(
                "text", "hello world", "key", KEY, "mode", "encrypt",
                "cipherMode", "GCM", "iv", FIXED_IV_12, "format", "hex"));
        // GCM 암호문 앞부분(평문 길이만큼)은 CTR(nonce||00000002) 키스트림 XOR — 독립 계산값
        assertThat(encrypted.textResult()).startsWith("955aa87171544c599a4a63");
        // 뒤에 16바이트(32 hex) 인증 태그가 붙는다
        assertThat(encrypted.textResult()).hasSize("hello world".length() * 2 + 32);

        ToolResult decrypted = run(Map.of(
                "text", encrypted.textResult(), "key", KEY, "mode", "decrypt",
                "cipherMode", "GCM", "iv", FIXED_IV_12, "format", "hex"));
        assertThat(decrypted.textResult()).isEqualTo("hello world");
    }

    @Test
    void gcmAutoIvRoundTrip() {
        ToolResult encrypted = run(Map.of(
                "text", "hello world", "key", KEY, "mode", "encrypt", "cipherMode", "GCM"));
        assertThat(encrypted.textResult()).isNotEqualTo("hello world");

        ToolResult decrypted = run(Map.of(
                "text", encrypted.textResult(), "key", KEY, "mode", "decrypt", "cipherMode", "GCM"));
        assertThat(decrypted.textResult()).isEqualTo("hello world");
    }

    @Test
    void ctrAndEcbMatchIndependentReference() {
        // CTR: IV를 초기 카운터로 사용 (독립 계산값)
        ToolResult ctr = run(Map.of(
                "text", "hello world", "key", KEY, "mode", "encrypt",
                "cipherMode", "CTR", "iv", FIXED_IV_16, "format", "hex"));
        assertThat(ctr.textResult()).isEqualTo("c81cf59c8d9fc9798bf9f7");

        // ECB: IV 없음, 결정적 (독립 계산값)
        ToolResult ecb = run(Map.of(
                "text", "hello world", "key", KEY, "mode", "encrypt",
                "cipherMode", "ECB", "format", "hex"));
        assertThat(ecb.textResult()).isEqualTo("8169bed4ef49a8874559c5b200daade7");

        ToolResult ecbDec = run(Map.of(
                "text", "8169bed4ef49a8874559c5b200daade7", "key", KEY, "mode", "decrypt",
                "cipherMode", "ECB", "format", "hex"));
        assertThat(ecbDec.textResult()).isEqualTo("hello world");
    }

    @Test
    void decryptWithWrongKeyFails() {
        ToolResult cbc = run(Map.of("text", "top secret", "key", KEY, "mode", "encrypt", "cipherMode", "CBC"));
        assertThatThrownBy(() -> run(Map.of(
                "text", cbc.textResult(), "key", "wrong-key-000000", "mode", "decrypt", "cipherMode", "CBC")))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("복호화에 실패");

        // GCM은 인증 태그 검증으로 반드시 실패해야 한다
        ToolResult gcm = run(Map.of("text", "top secret", "key", KEY, "mode", "encrypt", "cipherMode", "GCM"));
        assertThatThrownBy(() -> run(Map.of(
                "text", gcm.textResult(), "key", "wrong-key-000000", "mode", "decrypt", "cipherMode", "GCM")))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("복호화에 실패");
    }

    @Test
    void rejectsInvalidIvInputs() {
        // 길이가 틀린 IV
        assertThatThrownBy(() -> run(Map.of(
                "text", "hi", "key", KEY, "mode", "encrypt", "cipherMode", "CBC", "iv", "0011")))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("16바이트");

        // GCM은 12바이트 nonce
        assertThatThrownBy(() -> run(Map.of(
                "text", "hi", "key", KEY, "mode", "encrypt", "cipherMode", "GCM", "iv", FIXED_IV_16)))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("12바이트");

        // Hex가 아닌 IV
        assertThatThrownBy(() -> run(Map.of(
                "text", "hi", "key", KEY, "mode", "encrypt", "cipherMode", "CBC", "iv", "not-hex!!")))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("Hex 형식");

        // ECB에 IV를 주면 거부
        assertThatThrownBy(() -> run(Map.of(
                "text", "hi", "key", KEY, "mode", "encrypt", "cipherMode", "ECB", "iv", FIXED_IV_16)))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("ECB");
    }

    @Test
    void moduleMetadata() {
        assertThat(module.getId()).isEqualTo("aes");
        assertThat(module.isHeavy()).isFalse();
    }
}
