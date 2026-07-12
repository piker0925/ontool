package com.back.tool.security;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolModule;
import com.back.tool.model.ToolParams;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import org.springframework.security.crypto.bcrypt.BCrypt;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class BcryptModule implements ToolModule {

    /** bcrypt 해시 형식: $2a|$2b|$2x|$2y + 2자리 cost + 22자 salt + 31자 해시 (총 60자) */
    private static final Pattern BCRYPT_HASH = Pattern.compile(
            "^\\$2[abxy]\\$(\\d{2})\\$[./A-Za-z0-9]{53}$");

    private static final int MAX_PASSWORD_BYTES = 72;

    @Override
    public String getId() { return "bcrypt"; }

    @Override
    public String getName() { return "Bcrypt 해시"; }

    @Override
    public String getCategory() { return "security"; }

    @Override
    public boolean isHeavy() { return false; }

    @Override
    public ToolResult process(ToolInput input) {
        ToolParams params = ToolParams.of(input);
        String mode = params.getString("mode", "hash");
        String password = params.requireString("password");

        int passwordBytes = password.getBytes(StandardCharsets.UTF_8).length;
        if (passwordBytes > MAX_PASSWORD_BYTES) {
            throw new ToolProcessingException(
                    "비밀번호가 72바이트를 초과합니다 (현재 " + passwordBytes
                            + "바이트). bcrypt는 72바이트까지만 반영하므로 초과분은 무시됩니다.");
        }

        return switch (mode.toLowerCase()) {
            case "hash" -> hash(params, password);
            case "verify" -> verify(params, password);
            default -> throw new ToolProcessingException(
                    "파라미터 'mode'는 hash 또는 verify여야 합니다. (입력값: " + mode + ")");
        };
    }

    private ToolResult hash(ToolParams params, String password) {
        int rounds = params.getInt("rounds", 10, 4, 31);
        long start = System.nanoTime();
        String hash;
        try {
            hash = new BCryptPasswordEncoder(rounds).encode(password);
        } catch (Exception e) {
            throw new ToolProcessingException("Bcrypt 해시 실패: " + e.getMessage(), e);
        }
        long elapsedMs = (System.nanoTime() - start) / 1_000_000;

        return ToolResult.ofJson(Map.of(
                "type", "keyvalue",
                "items", List.of(
                        Map.of("key", "해시", "value", hash),
                        Map.of("key", "강도 (rounds)", "value", rounds + " — " + strengthLabel(rounds)),
                        Map.of("key", "처리 시간", "value", elapsedMs + "ms")
                )
        ));
    }

    private ToolResult verify(ToolParams params, String password) {
        String hash = params.requireString("hash").trim();
        Matcher m = BCRYPT_HASH.matcher(hash);
        if (!m.matches()) {
            throw new ToolProcessingException(
                    "유효하지 않은 bcrypt 해시 형식입니다. $2a$, $2b$, $2x$, $2y$로 시작하는 60자 해시여야 합니다.");
        }
        int rounds = Integer.parseInt(m.group(1));

        long start = System.nanoTime();
        boolean matches;
        try {
            matches = BCrypt.checkpw(password, hash);
        } catch (Exception e) {
            throw new ToolProcessingException("Bcrypt 검증 실패: " + e.getMessage(), e);
        }
        long elapsedMs = (System.nanoTime() - start) / 1_000_000;

        return ToolResult.ofJson(Map.of(
                "type", "keyvalue",
                "items", List.of(
                        Map.of("key", "검증 결과", "value", matches ? "✓ 일치" : "✗ 불일치"),
                        Map.of("key", "해시 강도 (rounds)", "value", rounds + " — " + strengthLabel(rounds)),
                        Map.of("key", "처리 시간", "value", elapsedMs + "ms")
                )
        ));
    }

    private String strengthLabel(int rounds) {
        if (rounds < 10) return "⚠️ 약함 (테스트 용도)";
        if (rounds <= 12) return "✓ 권장";
        return "느림 (고보안)";
    }
}
