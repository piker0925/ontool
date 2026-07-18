package com.back.job.controller;

import com.back.AbstractMySQLIntegrationTest;
import com.back.job.entity.Job;
import com.back.job.repository.JobRepository;
import com.back.job.service.JobService;
import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolModule;
import com.back.tool.model.ToolResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("local")
@TestPropertySource(properties = {
        "storage.upload-dir=build/test-uploads",
        "scheduling.worker.delay=300",
        "scheduling.ttl.delay=60000"
})
@Import(JobSseTest.TestModules.class)
class JobSseTest extends AbstractMySQLIntegrationTest {

    @LocalServerPort
    private int port;

    @Autowired JobService jobService;
    @Autowired JobRepository jobRepository;

    @BeforeEach
    void clean() {
        jobRepository.deleteAll();
    }

    @Test
    void stream_pendingJob_receivesDoneEventAfterProcessing() throws Exception {
        // Create PENDING job — connects to SSE while still pending.
        // The blocking send() call returns when the server calls emitter.complete()
        // (which happens once the worker marks the job DONE).
        Job job = jobService.create("sse-echo", com.back.tool.model.Lane.HEAVY, "owner-1", null, List.of(), Map.of());

        HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("http://localhost:" + port + "/api/v1/jobs/" + job.getId() + "/stream"))
                .timeout(Duration.ofSeconds(30))
                .header("Accept", "text/event-stream")
                .GET()
                .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.body()).contains("DONE");
    }

    @TestConfiguration
    static class TestModules {
        @Bean
        ToolModule sseEchoModule() {
            return new ToolModule() {
                public String getId() { return "sse-echo"; }
                public String getName() { return "SSE Echo"; }
                public String getCategory() { return "test"; }
                public boolean isHeavy() { return true; }
                public ToolResult process(ToolInput input) {
                    return ToolResult.ofText("sse-done");
                }
            };
        }
    }
}
