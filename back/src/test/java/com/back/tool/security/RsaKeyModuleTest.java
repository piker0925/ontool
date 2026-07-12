package com.back.tool.security;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolResult;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.Signature;
import java.security.interfaces.ECPublicKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class RsaKeyModuleTest {

    private static final ObjectMapper JSON = new ObjectMapper();

    /** keyvalue 결과에서 지정한 key의 value를 꺼낸다. 없으면 테스트 실패. */
    private static String itemValue(ToolResult result, String key) throws Exception {
        JsonNode root = JSON.readTree(result.textResult());
        assertThat(root.path("type").asText()).isEqualTo("keyvalue");
        for (JsonNode item : root.path("items")) {
            if (item.path("key").asText().equals(key)) return item.path("value").asText();
        }
        throw new AssertionError("keyvalue 결과에 '" + key + "' 항목이 없습니다: " + result.textResult());
    }

    private static byte[] pemBody(String pem, String type) {
        String base64 = pem
                .replaceAll("(?s).*-----BEGIN " + type + "-----", "")
                .replaceAll("(?s)-----END " + type + "-----.*", "")
                .replaceAll("\\s", "");
        return Base64.getDecoder().decode(base64);
    }

    /**
     * PEM의 PUBLIC KEY 블록을 지정한 알고리즘으로 파싱한다.
     * 요청한 keyType과 실제 키 알고리즘이 다르면 InvalidKeySpecException이 나서 테스트가 실패한다
     * (예: EC를 요청했는데 RSA 키가 나오면 여기서 걸린다).
     */
    private static PublicKey publicKey(String pem, String algorithm) throws Exception {
        return KeyFactory.getInstance(algorithm)
                .generatePublic(new X509EncodedKeySpec(pemBody(pem, "PUBLIC KEY")));
    }

    private static PrivateKey privateKey(String pem, String algorithm) throws Exception {
        return KeyFactory.getInstance(algorithm)
                .generatePrivate(new PKCS8EncodedKeySpec(pemBody(pem, "PRIVATE KEY")));
    }

    @Test
    void generatesRsa2048KeyPairAsSeparateKeyValueRows() throws Exception {
        RsaKeyModule module = new RsaKeyModule();
        ToolResult result = module.process(new ToolInput(List.of(), Map.of("keyType", "RSA", "keySize", "2048")));

        assertThat(result.isFile()).isFalse();

        // 공개키/개인키가 keyvalue 행으로 분리되어야 한다 (행별 복사 지원).
        String pubPem = itemValue(result, "공개키 (PEM)");
        String privPem = itemValue(result, "개인키 (PEM)");
        assertThat(pubPem).startsWith("-----BEGIN PUBLIC KEY-----").doesNotContain("PRIVATE");
        assertThat(privPem).startsWith("-----BEGIN PRIVATE KEY-----").doesNotContain("PUBLIC");
        assertThat(itemValue(result, "키 정보")).contains("RSA").contains("2048");

        RSAPublicKey pub = (RSAPublicKey) publicKey(pubPem, "RSA");
        assertThat(pub.getModulus().bitLength()).isEqualTo(2048);

        // 두 행이 실제 한 쌍인지 서명/검증 라운드트립으로 확인한다 —
        // 서로 다른 키쌍의 공개키/개인키를 섞어 반환하는 뮤턴트를 잡는다.
        PrivateKey priv = privateKey(privPem, "RSA");
        byte[] payload = "pairing-check".getBytes();
        Signature signer = Signature.getInstance("SHA256withRSA");
        signer.initSign(priv);
        signer.update(payload);
        byte[] sig = signer.sign();
        Signature verifier = Signature.getInstance("SHA256withRSA");
        verifier.initVerify(pub);
        verifier.update(payload);
        assertThat(verifier.verify(sig)).isTrue();
    }

    @Test
    void generatesEcKeyPair() throws Exception {
        RsaKeyModule module = new RsaKeyModule();
        ToolResult result = module.process(new ToolInput(List.of(), Map.of("keyType", "EC", "keySize", "256")));

        // EC를 요청했는데 기본 RSA로 고정 반환하는 뮤턴트는 EC 파싱에서 실패한다.
        ECPublicKey pub = (ECPublicKey) publicKey(itemValue(result, "공개키 (PEM)"), "EC");
        assertThat(pub.getParams().getCurve().getField().getFieldSize()).isEqualTo(256);
        assertThat(itemValue(result, "개인키 (PEM)")).startsWith("-----BEGIN PRIVATE KEY-----");
    }

    @Test
    void keySizeParamSelectsCurve() throws Exception {
        RsaKeyModule module = new RsaKeyModule();
        ToolResult result = module.process(new ToolInput(List.of(), Map.of("keyType", "EC", "keySize", "384")));

        // keySize를 무시하고 256으로 고정하는 뮤턴트를 잡는다.
        ECPublicKey pub = (ECPublicKey) publicKey(itemValue(result, "공개키 (PEM)"), "EC");
        assertThat(pub.getParams().getCurve().getField().getFieldSize()).isEqualTo(384);
    }

    @Test
    void moduleMetadata() {
        RsaKeyModule module = new RsaKeyModule();
        assertThat(module.getId()).isEqualTo("rsa-key");
        assertThat(module.isHeavy()).isFalse();
        assertThat(module.getCategory()).isEqualTo("security");
    }
}
