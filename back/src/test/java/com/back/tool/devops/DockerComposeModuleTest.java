package com.back.tool.devops;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import com.fasterxml.jackson.dataformat.yaml.YAMLMapper;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DockerComposeModuleTest {

    private static final YAMLMapper YAML = new YAMLMapper();

    private static ToolResult run(String command) {
        return new DockerComposeModule().process(new ToolInput(List.of(), Map.of("command", command)));
    }

    /**
     * 출력이 유효한 YAML임을 보장하며 파싱해 services.&lt;name&gt; 서비스 맵을 반환한다.
     * (경고 주석이 붙어도 YAML 파서가 정상적으로 읽을 수 있어야 한다.)
     */
    @SuppressWarnings("unchecked")
    private static Map<String, Object> service(ToolResult result, String name) throws Exception {
        Map<String, Object> root = YAML.readValue(result.textResult(), Map.class);
        Map<String, Object> services = (Map<String, Object>) root.get("services");
        assertThat(services).containsKey(name);
        return (Map<String, Object>) services.get(name);
    }

    @Test
    void convertsBasicDockerRun() throws Exception {
        ToolResult result = run("docker run -p 8080:80 nginx");

        assertThat(result.isFile()).isFalse();
        // 지원 옵션만 있으면 경고 주석이 없어야 한다 (패턴 B: 경고 on/off 대비).
        assertThat(result.textResult()).doesNotContain("# 경고");
        // 서비스 이름은 container_name이 없으면 이미지명에서 파생된다.
        Map<String, Object> svc = service(result, "nginx");
        assertThat(svc.get("image")).isEqualTo("nginx");
        assertThat(svc.get("ports")).isEqualTo(List.of("8080:80"));
    }

    @Test
    void mapsPortsEnvAndNameToExactComposeKeys() throws Exception {
        ToolResult result = run("docker run -p 8080:80 -e A=b --name web nginx");

        Map<String, Object> svc = service(result, "web");
        // 패턴 A: 각 플래그가 정확한 compose 키·값으로 매핑됐는지 독립 기준값과 비교.
        assertThat(svc.get("image")).isEqualTo("nginx");
        assertThat(svc.get("container_name")).isEqualTo("web");
        assertThat(svc.get("ports")).isEqualTo(List.of("8080:80"));
        assertThat(svc.get("environment")).isEqualTo(List.of("A=b"));
        assertThat(svc).doesNotContainKeys("volumes", "network_mode", "restart", "command");
    }

    @Test
    void mapsEveryFlagToCorrectComposeKey() throws Exception {
        ToolResult result = run(
                "docker run --name myapp -p 3000:3000 -e DB_HOST=localhost "
                        + "-v /data:/app/data --network bridge --restart always "
                        + "myimage:latest --spring.profiles.active=prod");

        // YAML 구조를 파싱해 각 플래그가 정확한 compose 키로 매핑됐는지 검증한다.
        Map<String, Object> svc = service(result, "myapp");
        assertThat(svc.get("image")).isEqualTo("myimage:latest");
        assertThat(svc.get("container_name")).isEqualTo("myapp");
        assertThat(svc.get("ports")).isEqualTo(List.of("3000:3000"));
        assertThat(svc.get("environment")).isEqualTo(List.of("DB_HOST=localhost"));
        assertThat(svc.get("volumes")).isEqualTo(List.of("/data:/app/data"));
        assertThat(svc.get("network_mode")).isEqualTo("bridge");
        assertThat(svc.get("restart")).isEqualTo("always");
        assertThat(svc.get("command")).isEqualTo("--spring.profiles.active=prod");
    }

    @Test
    void supportsLongFlagEqualsForm() throws Exception {
        ToolResult result = run("docker run --publish=8080:80 --env=A=b --name=web nginx");

        Map<String, Object> svc = service(result, "web");
        assertThat(svc.get("ports")).isEqualTo(List.of("8080:80"));
        assertThat(svc.get("environment")).isEqualTo(List.of("A=b"));
        assertThat(svc.get("container_name")).isEqualTo("web");
    }

    @Test
    void warnsUnsupportedFlagAsYamlCommentAndKeepsYamlValid() throws Exception {
        ToolResult result = run("docker run --memory 512m -p 80:80 nginx");

        // 미지원 플래그는 경고 주석으로 표시 (값까지 묶어서)
        assertThat(result.textResult())
                .contains("# 경고: 지원하지 않는 옵션 '--memory 512m'");

        // 경고가 있어도 YAML은 유효해야 하고, 지원 옵션은 살아남아야 한다 (패턴 B).
        Map<String, Object> svc = service(result, "nginx");
        assertThat(svc.get("image")).isEqualTo("nginx");
        assertThat(svc.get("ports")).isEqualTo(List.of("80:80"));
        // --memory의 값 512m이 이미지나 command로 오인식되지 않아야 한다.
        assertThat(svc).doesNotContainKey("command");
    }

    @Test
    void warnsUnknownFlagWithInlineValue() throws Exception {
        ToolResult result = run("docker run --gpus=all nginx");

        assertThat(result.textResult()).contains("# 경고: 지원하지 않는 옵션 '--gpus=all'");
        Map<String, Object> svc = service(result, "nginx");
        assertThat(svc.get("image")).isEqualTo("nginx");
    }

    @Test
    void blankCommandReportsRequiredParam() {
        assertThatThrownBy(() -> run("  "))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("command")
                .hasMessageContaining("필수");
    }

    @Test
    void missingImageReportsKoreanError() {
        assertThatThrownBy(() -> run("docker run -d --rm"))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("이미지 이름을 찾을 수 없습니다");
    }

    @Test
    void flagWithoutValueReportsKoreanError() {
        assertThatThrownBy(() -> run("docker run -p"))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("'-p'")
                .hasMessageContaining("값이 없습니다");
    }

    @Test
    void moduleMetadata() {
        DockerComposeModule module = new DockerComposeModule();
        assertThat(module.getId()).isEqualTo("docker-compose");
        assertThat(module.isHeavy()).isFalse();
        assertThat(module.getCategory()).isEqualTo("devops");
    }
}
