package com.back.tool.devops;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolResult;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class DockerComposeModuleTest {

    @Test
    void convertsBasicDockerRun() {
        DockerComposeModule module = new DockerComposeModule();
        ToolResult result = module.process(new ToolInput(
                List.of(), Map.of("command", "docker run -p 8080:80 nginx")
        ));

        assertThat(result.isFile()).isFalse();
        assertThat(result.textResult()).contains("image: nginx");
        assertThat(result.textResult()).contains("8080:80");
    }

    @Test
    void convertsWithEnvAndName() {
        DockerComposeModule module = new DockerComposeModule();
        ToolResult result = module.process(new ToolInput(
                List.of(), Map.of("command", "docker run --name myapp -e DB_HOST=localhost -p 3000:3000 myimage:latest")
        ));

        assertThat(result.textResult()).contains("image: myimage:latest");
        assertThat(result.textResult()).contains("container_name: myapp");
        assertThat(result.textResult()).contains("DB_HOST=localhost");
        assertThat(result.textResult()).contains("3000:3000");
    }

    @Test
    void moduleMetadata() {
        DockerComposeModule module = new DockerComposeModule();
        assertThat(module.getId()).isEqualTo("docker-compose");
        assertThat(module.isHeavy()).isFalse();
        assertThat(module.getCategory()).isEqualTo("devops");
    }
}
