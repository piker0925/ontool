package com.back.tool.devops;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolModule;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import com.fasterxml.jackson.dataformat.yaml.YAMLGenerator;
import com.fasterxml.jackson.dataformat.yaml.YAMLMapper;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class DockerComposeModule implements ToolModule {

    private static final YAMLMapper YAML = YAMLMapper.builder()
            .enable(YAMLGenerator.Feature.MINIMIZE_QUOTES)
            .disable(YAMLGenerator.Feature.WRITE_DOC_START_MARKER)
            .build();

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
        String command = input.params().getOrDefault("command", "").trim();
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

            int i = 0;
            while (i < tokens.size()) {
                String tok = tokens.get(i);
                switch (tok) {
                    case "-p", "--publish" -> { ports.add(tokens.get(++i)); i++; }
                    case "-e", "--env" -> { envs.add(tokens.get(++i)); i++; }
                    case "-v", "--volume" -> { volumes.add(tokens.get(++i)); i++; }
                    case "--name" -> { service.put("container_name", tokens.get(++i)); i++; }
                    case "--network" -> { service.put("network_mode", tokens.get(++i)); i++; }
                    case "--restart" -> { service.put("restart", tokens.get(++i)); i++; }
                    case "-d", "--detach" -> i++;
                    default -> {
                        if (!tok.startsWith("-")) {
                            service.put("image", tok);
                            // remaining tokens are the container command
                            if (i + 1 < tokens.size()) {
                                service.put("command", String.join(" ", tokens.subList(i + 1, tokens.size())));
                            }
                            i = tokens.size();
                        } else {
                            i++;
                        }
                    }
                }
            }

            if (!ports.isEmpty()) service.put("ports", ports);
            if (!envs.isEmpty()) service.put("environment", envs);
            if (!volumes.isEmpty()) service.put("volumes", volumes);

            String serviceName = (String) service.getOrDefault("container_name",
                    ((String) service.getOrDefault("image", "app")).replaceAll("[:/].*", ""));

            Map<String, Object> compose = new LinkedHashMap<>();
            compose.put("services", Map.of(serviceName, service));

            return ToolResult.ofText(YAML.writeValueAsString(compose).trim());
        } catch (Exception e) {
            throw new ToolProcessingException("변환 실패: " + e.getMessage(), e);
        }
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
