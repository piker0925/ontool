package com.back.job.service;

import com.back.AbstractMySQLIntegrationTest;
import com.back.global.storage.FileStorage;
import com.back.job.entity.Job;
import com.back.job.entity.JobStatus;
import com.back.job.repository.JobRepository;
import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolModule;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import java.util.List;
import java.util.Map;

import static java.util.concurrent.TimeUnit.SECONDS;
import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

@SpringBootTest
@ActiveProfiles("local")
@TestPropertySource(properties = {
        "storage.upload-dir=build/test-uploads",
        "scheduling.worker.delay=200",
        "scheduling.ttl.delay=200"
})
@Import(JobWorkerTest.TestModules.class)
class JobWorkerTest extends AbstractMySQLIntegrationTest {

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
        job.setExpiresAt(java.time.LocalDateTime.now().plusHours(1));
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
    void processJob_deletesInputTempDir_butKeepsUnrelatedFiles() throws Exception {
        java.nio.file.Path uploadDir = java.nio.file.Path.of("build/test-uploads");
        String tempId = java.util.UUID.randomUUID().toString();
        java.nio.file.Path inputDir = uploadDir.resolve("temp").resolve(tempId);
        java.nio.file.Files.createDirectories(inputDir);
        java.nio.file.Path inputFile = inputDir.resolve("input.txt");
        java.nio.file.Files.writeString(inputFile, "hi");

        // 이 job과 무관한 파일 — 삭제되면 안 된다 (넓게 잘못 지우는 구현을 걸러냄)
        java.nio.file.Path unrelated = uploadDir.resolve("temp").resolve("keep").resolve("other.txt");
        java.nio.file.Files.createDirectories(unrelated.getParent());
        java.nio.file.Files.writeString(unrelated, "keep");

        Job job = new Job();
        job.setModuleId("echo");
        job.setStatus(JobStatus.PENDING);
        job.setInputPaths(List.of(inputFile.toAbsolutePath().toString()));
        job.setParams(Map.of());
        job.setExpiresAt(java.time.LocalDateTime.now().plusHours(1));
        jobRepository.save(job);

        await().atMost(10, SECONDS).until(() ->
                jobRepository.findById(job.getId())
                        .map(j -> j.getStatus() == JobStatus.DONE)
                        .orElse(false));

        assertThat(java.nio.file.Files.exists(inputDir)).isFalse();
        assertThat(java.nio.file.Files.exists(unrelated)).isTrue();
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
        Job expiring = pending("echo");
        Job surviving = pending("echo");

        await().atMost(10, SECONDS).until(() ->
                jobRepository.findById(expiring.getId())
                        .map(j -> j.getStatus() == JobStatus.DONE)
                        .orElse(false)
                        && jobRepository.findById(surviving.getId())
                        .map(j -> j.getStatus() == JobStatus.DONE)
                        .orElse(false));

        Job done = jobRepository.findById(expiring.getId()).orElseThrow();
        done.expireNow();
        jobRepository.save(done);

        await().atMost(5, SECONDS).until(() ->
                jobRepository.findById(expiring.getId()).isEmpty());

        assertThat(jobRepository.findById(surviving.getId())).isPresent();
    }

    @Test
    void ttlScheduler_sweepsOldOrphanFile_keepsFreshOne() throws Exception {
        // Job row가 전혀 없는 고아 파일도 mtime 기준으로 청소되어야 한다.
        java.nio.file.Path uploadDir = java.nio.file.Path.of("build/test-uploads");

        java.nio.file.Path oldOrphan = uploadDir.resolve("temp").resolve("orphan-old").resolve("x.png");
        java.nio.file.Files.createDirectories(oldOrphan.getParent());
        java.nio.file.Files.writeString(oldOrphan, "x");
        // 기본 result-ttl(24h)보다 오래됨 → 스윕 대상
        java.nio.file.Files.setLastModifiedTime(oldOrphan,
                java.nio.file.attribute.FileTime.from(java.time.Instant.now().minus(java.time.Duration.ofHours(25))));

        java.nio.file.Path freshOrphan = uploadDir.resolve("temp").resolve("orphan-new").resolve("y.png");
        java.nio.file.Files.createDirectories(freshOrphan.getParent());
        java.nio.file.Files.writeString(freshOrphan, "y");

        await().atMost(5, SECONDS).until(() -> !java.nio.file.Files.exists(oldOrphan));
        assertThat(java.nio.file.Files.exists(freshOrphan)).isTrue(); // 최신 고아는 살아남아야 한다
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
