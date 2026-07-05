package com.back.domain.job;

import com.back.domain.tool.ToolInput;
import com.back.domain.tool.ToolModule;
import com.back.domain.tool.ToolProcessingException;
import com.back.domain.tool.ToolResult;
import com.back.global.storage.FileStorage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;
import java.util.Map;

import static java.util.concurrent.TimeUnit.SECONDS;
import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

@SpringBootTest
@Testcontainers
@ActiveProfiles("local")
@TestPropertySource(properties = {
        "storage.upload-dir=build/test-uploads",
        "scheduling.worker.delay=200",
        "scheduling.ttl.delay=200"
})
@Import(JobWorkerTest.TestModules.class)
class JobWorkerTest {

    @Container
    @ServiceConnection
    static MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.0")
            .withDatabaseName("devtoolbox")
            .withUsername("devtoolbox")
            .withPassword("1234");

    @Autowired
    JobRepository jobRepository;
    @Autowired
    FileStorage fileStorage;

    @BeforeEach
    void cleanUp() {
        jobRepository.deleteAll();
    }

    private Job pending(String moduleId) {
        Job job = new Job();
        job.setModuleId(moduleId);
        job.setStatus(JobStatus.PENDING);
        job.setInputPaths(List.of());
        job.setParams(Map.of());
        return jobRepository.save(job);
    }

    @Test
    void pendingJob_processedToDone() {
        Job job = pending("echo");

        await().atMost(10, SECONDS).until(() ->
                jobRepository.findById(job.getId())
                        .map(j -> j.getStatus() == JobStatus.DONE)
                        .orElse(false));

        assertThat(jobRepository.findById(job.getId()).orElseThrow().getResultText())
                .isEqualTo("ok");
    }

    @Test
    void moduleThrows_jobIsFailed() {
        Job job = pending("fail");

        await().atMost(10, SECONDS).until(() ->
                jobRepository.findById(job.getId())
                        .map(j -> j.getStatus() == JobStatus.FAILED)
                        .orElse(false));
    }

    @Test
    void expiredJob_deletedByTtlScheduler() {
        Job job = pending("echo");

        await().atMost(10, SECONDS).until(() ->
                jobRepository.findById(job.getId())
                        .map(j -> j.getStatus() == JobStatus.DONE)
                        .orElse(false));

        Job done = jobRepository.findById(job.getId()).orElseThrow();
        done.expireNow();
        jobRepository.save(done);

        await().atMost(5, SECONDS).until(() ->
                jobRepository.findById(job.getId()).isEmpty());
    }

    @TestConfiguration
    static class TestModules {
        @Bean
        ToolModule echoModule() {
            return new ToolModule() {
                public String getId() {
                    return "echo";
                }

                public String getName() {
                    return "Echo";
                }

                public String getCategory() {
                    return "test";
                }

                public boolean isHeavy() {
                    return true;
                }

                public ToolResult process(ToolInput input) {
                    return ToolResult.ofText("ok");
                }
            };
        }

        @Bean
        ToolModule failModule() {
            return new ToolModule() {
                public String getId() {
                    return "fail";
                }

                public String getName() {
                    return "Fail";
                }

                public String getCategory() {
                    return "test";
                }

                public boolean isHeavy() {
                    return true;
                }

                public ToolResult process(ToolInput input) {
                    throw new ToolProcessingException("boom");
                }
            };
        }
    }
}
