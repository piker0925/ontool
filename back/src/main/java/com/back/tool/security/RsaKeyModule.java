package com.back.tool.security;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolModule;
import com.back.tool.model.ToolParams;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import org.bouncycastle.util.io.pem.PemObject;
import org.bouncycastle.util.io.pem.PemWriter;
import org.springframework.stereotype.Component;

import java.io.StringWriter;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.spec.ECGenParameterSpec;
import java.util.List;
import java.util.Map;

@Component
public class RsaKeyModule implements ToolModule {

    @Override
    public String getId() { return "rsa-key"; }

    @Override
    public String getName() { return "RSA/EC 키쌍 생성"; }

    @Override
    public String getCategory() { return "security"; }

    @Override
    public boolean isHeavy() { return false; }

    @Override
    public ToolResult process(ToolInput input) {
        ToolParams params = ToolParams.of(input);
        String keyType = params.getString("keyType", "RSA").toUpperCase();
        int keySize = params.getInt("keySize", 2048, 256, 8192);

        try {
            KeyPairGenerator gen = KeyPairGenerator.getInstance(keyType);
            if (keyType.equals("EC")) {
                String curve = keySize == 384 ? "secp384r1" : keySize == 521 ? "secp521r1" : "secp256r1";
                gen.initialize(new ECGenParameterSpec(curve));
            } else {
                gen.initialize(keySize);
            }
            KeyPair pair = gen.generateKeyPair();

            String pub = toPem("PUBLIC KEY", pair.getPublic().getEncoded());
            String priv = toPem("PRIVATE KEY", pair.getPrivate().getEncoded());

            return ToolResult.ofJson(Map.of(
                    "type", "keyvalue",
                    "items", List.of(
                            Map.of("key", "키 정보", "value",
                                    keyType + " " + keySize + "비트 · 공개키 X.509(SPKI) / 개인키 PKCS#8"),
                            Map.of("key", "공개키 (PEM)", "value", pub),
                            Map.of("key", "개인키 (PEM)", "value", priv)
                    )
            ));
        } catch (ToolProcessingException e) {
            throw e;
        } catch (Exception e) {
            throw new ToolProcessingException("키쌍 생성 실패: " + e.getMessage(), e);
        }
    }

    private String toPem(String type, byte[] data) throws Exception {
        StringWriter sw = new StringWriter();
        try (PemWriter pw = new PemWriter(sw)) {
            pw.writeObject(new PemObject(type, data));
        }
        return sw.toString();
    }
}
