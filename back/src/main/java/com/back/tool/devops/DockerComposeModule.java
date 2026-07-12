package com.back.tool.devops;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolModule;
import com.back.tool.model.ToolParams;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import com.fasterxml.jackson.dataformat.yaml.YAMLGenerator;
import com.fasterxml.jackson.dataformat.yaml.YAMLMapper;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Component
public class DockerComposeModule implements ToolModule {

    private static final YAMLMapper YAML = YAMLMapper.builder()
            .enable(YAMLGenerator.Feature.MINIMIZE_QUOTES)
            .disable(YAMLGenerator.Feature.WRITE_DOC_START_MARKER)
            .build();

    /** 값 없이 쓰이는 플래그 — 조용히 건너뛴다 (compose에 대응 개념이 없거나 불필요). */
    private static final Set<String> BOOLEAN_FLAGS = Set.of(
            "-d", "--detach", "--rm", "-i", "--interactive", "-t", "--tty",
            "-it", "-ti", "-itd", "-dit", "--init", "--privileged",
            "-P", "--publish-all", "--read-only", "--no-healthcheck");

    /** 미지원이지만 값을 하나 소비하는 플래그 — 값까지 묶어 경고 처리해 이미지 오인식을 막는다. */
    private static final Set<String> UNSUPPORTED_VALUE_FLAGS = Set.of(
            "-m", "--memory", "--memory-swap", "--cpus", "--cpu-shares",
            "-u", "--user", "-w", "--workdir", "--entrypoint", "-h", "--hostname",
            "-l", "--label", "--log-driver", "--log-opt", "--health-cmd", "--health-interval",
            "--add-host", "--dns", "--cap-add", "--cap-drop", "--security-opt",
            "--device", "--ulimit", "--expose", "--link", "--ip", "--mac-address",
            "--pid", "--shm-size", "--tmpfs", "--platform", "--pull", "--stop-timeout");

    @Override
    public String getId() { return "docker-compose"; }

    @Override
    public String getName() { return "docker run → Compose 변환"; }

    @Override
    public String getCategory() { return "devops"; }

    @Override
    public boolean isHeavy() { return false; }

    @Override
    public ToolResult process(ToolInput input) {
        String command = ToolParams.of(input).requireString("command").trim();
        try {
            List<String> tokens = tokenize(command);
            // strip "docker" and "run"
            int start = 0;
            if (!tokens.isEmpty() && tokens.get(0).equals("docker")) start++;
            if (start < tokens.size() && tokens.get(start).equals("run")) start++;
            tokens = tokens.subList(start, tokens.size());

            Map<String, Object> service = new LinkedHashMap<>();
            List<String> ports = new ArrayList<>();
            List<String> envs = new ArrayList<>();
            List<String> volumes = new ArrayList<>();
            List<String> warnings = new ArrayList<>();

            int i = 0;
            while (i < tokens.size()) {
                String tok = tokens.get(i);
                if (!tok.startsWith("-")) {
                    service.put("image", tok);
                    // 이미지 뒤 나머지 토큰은 컨테이너 command
                    if (i + 1 < tokens.size()) {
                        service.put("command", String.join(" ", tokens.subList(i + 1, tokens.size())));
                    }
                    break;
                }

                // "--flag=value" 형태 분리
                String flag = tok;
                String inlineValue = null;
                if (tok.startsWith("--")) {
                    int eq = tok.indexOf('=');
                    if (eq >= 0) {
                        flag = tok.substring(0, eq);
                        inlineValue = tok.substring(eq + 1);
                    }
                }

                int[] cursor = {i};
                switch (flag) {
                    case "-p", "--publish" -> ports.add(flagValue(tokens, cursor, flag, inlineValue));
                    case "-e", "--env" -> envs.add(flagValue(tokens, cursor, flag, inlineValue));
                    case "-v", "--volume" -> volumes.add(flagValue(tokens, cursor, flag, inlineValue));
                    case "--name" -> service.put("container_name", flagValue(tokens, cursor, flag, inlineValue));
                    case "--network" -> service.put("network_mode", flagValue(tokens, cursor, flag, inlineValue));
                    case "--restart" -> service.put("restart", flagValue(tokens, cursor, flag, inlineValue));
                    default -> {
                        if (!BOOLEAN_FLAGS.contains(flag)) {
                            String warned = tok;
                            if (inlineValue == null && UNSUPPORTED_VALUE_FLAGS.contains(flag)
                                    && cursor[0] + 1 < tokens.size()) {
                                warned = flag + " " + tokens.get(++cursor[0]);
                            }
                            warnings.add(warned);
                        }
                    }
                }
                i = cursor[0] + 1;
            }

            if (!ports.isEmpty()) service.put("ports", ports);
            if (!envs.isEmpty()) service.put("environment", envs);
            if (!volumes.isEmpty()) service.put("volumes", volumes);

            if (service.get("image") == null) {
                throw new ToolProcessingException(
                        "이미지 이름을 찾을 수 없습니다. 'docker run [옵션] 이미지 [명령]' 형식으로 입력해 주세요.");
            }

            String serviceName = (String) service.getOrDefault("container_name",
                    ((String) service.get("image")).replaceAll("[:/].*", ""));

            Map<String, Object> compose = new LinkedHashMap<>();
            compose.put("services", Map.of(serviceName, service));

            StringBuilder out = new StringBuilder();
            for (String warned : warnings) {
                out.append("# 경고: 지원하지 않는 옵션 '").append(warned).append("'은(는) 변환에서 제외되었습니다.\n");
            }
            out.append(YAML.writeValueAsString(compose).trim());
            return ToolResult.ofText(out.toString());
        } catch (ToolProcessingException e) {
            throw e;
        } catch (Exception e) {
            throw new ToolProcessingException("변환 실패: " + e.getMessage(), e);
        }
    }

    /** 인라인(=) 값이 있으면 그 값을, 없으면 다음 토큰을 값으로 소비한다. */
    private String flagValue(List<String> tokens, int[] cursor, String flag, String inlineValue) {
        if (inlineValue != null) return inlineValue;
        if (cursor[0] + 1 >= tokens.size()) {
            throw new ToolProcessingException("옵션 '" + flag + "'의 값이 없습니다. (예: " + flag + " 값)");
        }
        return tokens.get(++cursor[0]);
    }

    private List<String> tokenize(String cmd) {
        List<String> tokens = new ArrayList<>();
        StringBuilder cur = new StringBuilder();
        boolean inQuote = false;
        char quoteChar = 0;
        for (char c : cmd.toCharArray()) {
            if (inQuote) {
                if (c == quoteChar) { inQuote = false; }
                else cur.append(c);
            } else if (c == '"' || c == '\'') {
                inQuote = true; quoteChar = c;
            } else if (c == ' ') {
                if (!cur.isEmpty()) { tokens.add(cur.toString()); cur.setLength(0); }
            } else {
                cur.append(c);
            }
        }
        if (!cur.isEmpty()) tokens.add(cur.toString());
        return tokens;
    }
}
