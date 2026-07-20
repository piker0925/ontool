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
        "scheduling.ttl.delay=200",
        "scheduling.worker.lane.heavy=2",
        "scheduling.worker.lane.video=1"
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
    void lane_dispatchesUpToPermitConcurrently_andCapsAtLaneLimit() throws Exception {
        // HEAVY 레인 permit=2 (test property). block 모듈은 latch가 열릴 때까지 처리 스레드를 붙잡는다.
        // 3개를 넣으면: 2개는 RUNNING으로 올라가고(폴링당 1개만 처리하던 옛 구조라면 불가),
        // 3번째는 permit 소진으로 PENDING에 머물러야 한다 (레인 상한이 실제로 강제됨).
        BlockingModule.reset();
        Job a = pending("block");
        Job b = pending("block");
        Job c = pending("block");

        try {
            // 정확히 2개가 RUNNING이 될 때까지 대기 (한 번에 여러 건 디스패치 + permit 상한)
            await().atMost(10, SECONDS).until(() -> runningCount("block") == 2);

            // 세 번째는 여유 permit이 없어 PENDING이어야 한다 — "2개 동시"와 "전부 실행"을 구분
            assertThat(pendingCount("block")).isEqualTo(1);
            assertThat(runningCount("block")).isEqualTo(2);
        } finally {
            BlockingModule.release(); // 처리 스레드 해제 — permit 반납되어 나머지도 흘러감
        }

        // latch 해제 후 3개 모두 완료 (반납된 permit으로 3번째까지 처리)
        await().atMost(10, SECONDS).until(() ->
                jobRepository.findAllById(List.of(a.getId(), b.getId(), c.getId())).stream()
                        .allMatch(j -> j.getStatus() == JobStatus.DONE));
    }

    private long runningCount(String moduleId) {
        return jobRepository.findAll().stream()
                .filter(j -> moduleId.equals(j.getModuleId()) && j.getStatus() == JobStatus.RUNNING)
                .count();
    }

    private long pendingCount(String moduleId) {
        return jobRepository.findAll().stream()
                .filter(j -> moduleId.equals(j.getModuleId()) && j.getStatus() == JobStatus.PENDING)
                .count();
    }

    @Test
    void progressReportingModule_updatesJobProgressBeforeCompletion() {
        // ProgressModule은 50%를 보고한 뒤 latch가 열릴 때까지 멈춘다 — 그 사이 job.progress가
        // 0→100으로 곧장 점프하지 않고 중간값(50)을 실제로 거치는지 관찰한다(037, ADR-0019 진행률 배관).
        ProgressModule.reset();
        Job job = pending("progress");

        await().atMost(10, SECONDS).until(() ->
                jobRepository.findById(job.getId())
                        .map(j -> j.getProgress() == 50 && j.getStatus() == JobStatus.RUNNING)
                        .orElse(false));

        ProgressModule.release();

        await().atMost(10, SECONDS).until(() ->
                jobRepository.findById(job.getId())
                        .map(j -> j.getStatus() == JobStatus.DONE)
                        .orElse(false));
        assertThat(jobRepository.findById(job.getId()).orElseThrow().getProgress()).isEqualTo(100);
    }

    @Test
    void videoTrimConvertModule_realFfmpegProgressSurvivesThrottleAndReachesDb() throws Exception {
        // FfmpegSupport의 실제 out_time_ms tick → JobWorker의 스로틀된 updateProgress()까지 전체
        // 배관이 이어지는지 검증한다(037 AC — VideoTrimConvertModuleTest는 리포터만, 이 테스트는
        // 리포터+스로틀+DB 저장까지 실제 ffmpeg로 검증해 그 갭을 메운다).
        // uploadDir(build/test-uploads) 밖의 시스템 임시 디렉토리에 쓴다 — TtlCleanupScheduler가
        // 200ms(테스트 설정)마다 uploadDir 아래 "비워진 디렉토리"를 청소하는데, ffmpeg 프로세스 기동에
        // 걸리는 수십 ms 동안 방금 만든 빈 디렉토리가 그 청소 대상이 되어 파일을 쓰기 직전에 부모
        // 디렉토리가 사라지는 레이스가 실제로 관찰됐다(uploadDir 밖은 스케줄러가 건드리지 않는다).
        java.nio.file.Path inputDir = java.nio.file.Files.createTempDirectory("video-e2e-");
        java.nio.file.Path source = inputDir.resolve("source.mp4");
        Process gen = new ProcessBuilder(
                "ffmpeg", "-y", "-f", "lavfi", "-i", "testsrc=duration=30:size=640x480:rate=30",
                "-c:v", "libx264", "-g", "30", "-pix_fmt", "yuv420p", source.toAbsolutePath().toString())
                .redirectErrorStream(true).start();
        String genOutput = new String(gen.getInputStream().readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
        if (gen.waitFor() != 0 || !java.nio.file.Files.exists(source)) {
            throw new IllegalStateException("테스트용 영상 생성 실패: " + genOutput);
        }

        Job job = new Job();
        job.setModuleId("video-trim-convert");
        job.setStatus(JobStatus.PENDING);
        job.setInputPaths(List.of(source.toAbsolutePath().toString()));
        job.setParams(Map.of("targetFormat", "mp4")); // 컨테이너 변경 없어도 targetFormat 지정 시 재인코딩 경로
        job.setExpiresAt(java.time.LocalDateTime.now().plusHours(1));
        jobRepository.save(job);

        java.util.Set<Integer> seenProgress = new java.util.concurrent.ConcurrentSkipListSet<>();
        await().atMost(30, SECONDS).pollInterval(java.time.Duration.ofMillis(50)).until(() -> {
            jobRepository.findById(job.getId()).ifPresent(j -> seenProgress.add(j.getProgress()));
            return jobRepository.findById(job.getId())
                    .map(j -> j.getStatus() == JobStatus.DONE)
                    .orElse(false);
        });

        assertThat(seenProgress).anyMatch(p -> p > 0 && p < 100); // 0→100 점프가 아니라 실제 중간값을 거침
        assertThat(jobRepository.findById(job.getId()).orElseThrow().getProgress()).isEqualTo(100);
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
        ToolModule blockingModule() {
            return new BlockingModule();
        }

        @Bean
        ToolModule progressModule() {
            return new ProgressModule();
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

    /** 50%를 보고한 뒤 latch가 열릴 때까지 멈춰 중간 진행률 상태를 관찰 가능하게 만드는 테스트용 모듈. */
    static class ProgressModule implements ToolModule {
        private static volatile java.util.concurrent.CountDownLatch latch = new java.util.concurrent.CountDownLatch(1);

        static void reset() {
            latch = new java.util.concurrent.CountDownLatch(1);
        }

        static void release() {
            latch.countDown();
        }

        public String getId() {
            return "progress";
        }

        public String getName() {
            return "Progress";
        }

        public String getCategory() {
            return "test";
        }

        public boolean isHeavy() {
            return true;
        }

        public ToolResult process(ToolInput input) {
            input.progressReporter().report(50);
            try {
                latch.await(15, SECONDS);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            return ToolResult.ofText("done");
        }
    }

    /** latch가 열릴 때까지 처리 스레드를 붙잡아 permit 상한을 관찰 가능하게 만드는 테스트용 Heavy 모듈. */
    static class BlockingModule implements ToolModule {
        private static volatile java.util.concurrent.CountDownLatch latch = new java.util.concurrent.CountDownLatch(1);

        static void reset() {
            latch = new java.util.concurrent.CountDownLatch(1);
        }

        static void release() {
            latch.countDown();
        }

        public String getId() {
            return "block";
        }

        public String getName() {
            return "Block";
        }

        public String getCategory() {
            return "test";
        }

        public boolean isHeavy() {
            return true;
        }

        public ToolResult process(ToolInput input) {
            try {
                latch.await(15, SECONDS); // 테스트가 release()로 열어줄 때까지 대기 (self-timeout 방어)
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            return ToolResult.ofText("done");
        }
    }
}
