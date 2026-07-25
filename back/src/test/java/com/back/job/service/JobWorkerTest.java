package com.back.job.service;

import com.back.AbstractMySQLIntegrationTest;
import com.back.global.storage.FileStorage;
import com.back.job.entity.Job;
import com.back.job.entity.JobStatus;
import com.back.job.repository.JobRepository;
import com.back.tool.model.Lane;
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

import java.util.ArrayList;
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

    private Job pendingOwnedBy(String moduleId, String ownerToken) {
        return jobRepository.save(buildPendingOwnedBy(moduleId, ownerToken));
    }

    /** 저장하지 않고 엔티티만 구성 — 여러 건을 saveAll로 한 트랜잭션에 묶어 넣을 때 쓴다. */
    private Job buildPendingOwnedBy(String moduleId, String ownerToken) {
        return buildPendingOwnedBy(moduleId, ownerToken, Lane.HEAVY);
    }

    private Job buildPendingOwnedBy(String moduleId, String ownerToken, Lane lane) {
        Job job = new Job();
        job.setModuleId(moduleId);
        job.setOwnerToken(ownerToken);
        job.setLane(lane);
        job.setStatus(JobStatus.PENDING);
        job.setInputPaths(List.of());
        job.setParams(Map.of());
        job.setExpiresAt(java.time.LocalDateTime.now().plusHours(1));
        return job;
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

    @Test
    void lane_rotatesOwnersAcrossTicks_soLateOwnerIsServedWithoutDrainingEarlierBacklog() {
        // 127 배선(wiring) 검증 — HEAVY 레인 permit=2(test property). echo 모듈은 즉시 완료되므로
        // BlockingModule과 달리 permit을 점유해 묶어두지 않고, 매 폴링 틱마다 실제로 다음 owner가
        // 회전 선택되는지를 관찰할 수 있다. A·B가 먼저 각각 여러 건을 채우고, C가 가장 나중에(가장 최근
        // created_at) 1건만 투입한다. selectFair의 rotate 로직 자체는 JobWorkerFairnessTest가 순수
        // 함수로 커버하지만, dispatchLane이 lastServedOwner를 실제로 저장·재사용하는지는 이 테스트가
        // 아니면 못 잡는다 — 예를 들어 lastServedOwner.put(...) 줄이 통째로 빠져도 순수 함수 테스트는
        // 여전히 그린이지만, 그러면 C는 A·B 백로그(16건)가 전부 빠질 때까지 DONE이 안 된다.
        //
        // saveAll로 17건을 한 트랜잭션에 묶어 넣는다 — 폴링 주기(200ms)가 짧아, 개별 save()를 17번
        // 나눠 호출하면 그 자체로 수십~백여 ms가 걸려 첫 폴링 틱이 셋업 도중(A만 존재하는 상태)에
        // 끼어들 수 있다. 그러면 "owner 수 3 > permit 2"라는 전제 자체가 틱마다 달라져 이 테스트가
        // 회귀를 못 잡는다(실측: saveAll 없이 개별 save로 짰을 때 mutation-test로 lastServedOwner.put을
        // 지워봤더니 이 테스트가 여전히 그린이었다 — 셋업 타이밍 경합이 원인).
        List<Job> batch = new ArrayList<>();
        for (int i = 0; i < 8; i++) {
            batch.add(buildPendingOwnedBy("echo", "A"));
        }
        for (int i = 0; i < 8; i++) {
            batch.add(buildPendingOwnedBy("echo", "B"));
        }
        Job cToSave = buildPendingOwnedBy("echo", "C");
        batch.add(cToSave);
        jobRepository.saveAll(batch);
        Job c = cToSave;

        // C가 DONE이 되는 시점에도 A 또는 B의 PENDING 잔여가 남아있어야 한다 — 회전이 실제로 걸려
        // C가 A·B 백로그를 다 소진하기 전에(두 번째 틱 안에) 서비스됐다는 뜻이다.
        // 수정 전(회전 없음) 코드라면 C는 A·B의 16건이 전부 끝난 뒤에야 DONE이 되므로 이 조건이
        // 성립하는 순간을 관찰하지 못하고 타임아웃된다.
        await().atMost(10, SECONDS).pollInterval(java.time.Duration.ofMillis(50)).until(() -> {
            boolean cDone = jobRepository.findById(c.getId())
                    .map(j -> j.getStatus() == JobStatus.DONE)
                    .orElse(false);
            if (!cDone) {
                return false;
            }
            long remainingBacklog = jobRepository.findAll().stream()
                    .filter(j -> "echo".equals(j.getModuleId()))
                    .filter(j -> "A".equals(j.getOwnerToken()) || "B".equals(j.getOwnerToken()))
                    .filter(j -> j.getStatus() == JobStatus.PENDING)
                    .count();
            return remainingBacklog > 0;
        });
    }

    @Test
    void lane_rotatesAnonymousOwnerGroupAcrossTicks_soNamedOwnerIsServedWithoutDrainingAnonymousBacklog() {
        // 127 후속(1차 코드리뷰 지적 반영) — 위 테스트는 문자열 owner("A"/"B"/"C")만 다뤄, dispatchLane의
        // null→"" 정규화(JobWorker.normalizeOwner)가 통째로 빠져도 잡지 못한다: 그 경우
        // lastServedOwner에는 raw null이 저장되고, selectFair는 이를 "회전 상태 없음"으로 오인해 매
        // 틱 맨 앞(가장 오래된 owner, 여기서는 익명 그룹)부터 다시 시작한다 — 그러면 USER는 익명
        // 백로그가 전부 빠질 때까지 굶는다. 이 테스트는 익명 그룹(ownerToken=null)이 "마지막으로
        // 서비스된 owner"가 되는 케이스를 실제 dispatchLane 배선으로 검증한다.
        //
        // VIDEO 레인(permit=1, test property)을 쓴다 — 매 틱 정확히 1건만 골라, "이번 틱에 마지막으로
        // 고른 owner"가 곧 "이번 틱에 고른 유일한 owner"가 되므로 통제가 결정론적이다. 익명 그룹이
        // 가장 먼저(가장 오래된 created_at) 생성돼 첫 틱은 반드시 익명 그룹에서 뽑히고, 두 번째 틱은
        // (정규화가 정상이면) 회전이 걸려 USER로 넘어가야 한다.
        List<Job> batch = new ArrayList<>();
        for (int i = 0; i < 4; i++) {
            batch.add(buildPendingOwnedBy("echo", null, Lane.VIDEO));
        }
        Job userToSave = buildPendingOwnedBy("echo", "USER", Lane.VIDEO);
        batch.add(userToSave);
        jobRepository.saveAll(batch);
        Job user = userToSave;

        // USER가 DONE이 되는 시점에도 익명 그룹의 PENDING 잔여가 남아있어야 한다 — 회전이 실제로 걸려
        // USER가 익명 백로그를 다 소진하기 전에(두 번째 틱 안에) 서비스됐다는 뜻이다.
        // null→"" 정규화가 빠진 코드라면 USER는 익명 그룹의 4건이 전부 끝난 뒤에야 DONE이 되므로 이
        // 조건이 성립하는 순간을 관찰하지 못하고 타임아웃된다.
        await().atMost(10, SECONDS).pollInterval(java.time.Duration.ofMillis(50)).until(() -> {
            boolean userDone = jobRepository.findById(user.getId())
                    .map(j -> j.getStatus() == JobStatus.DONE)
                    .orElse(false);
            if (!userDone) {
                return false;
            }
            long remainingAnonymousBacklog = jobRepository.findAll().stream()
                    .filter(j -> "echo".equals(j.getModuleId()))
                    .filter(j -> j.getOwnerToken() == null)
                    .filter(j -> j.getStatus() == JobStatus.PENDING)
                    .count();
            return remainingAnonymousBacklog > 0;
        });
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
        //
        // 131 진단: 이전의 640x480/30s 소스는 실제 재인코딩(-c:v libx264 -c:a aac, 프리셋 기본값)이
        // 0.5초 안팎으로 끝나버려 ffmpeg가 "-progress" 라인을 단 한 번(그것도 종료 직전, 99%대)만
        // 찍는 경우가 흔했다 — 그러면 DB에 남는 진행률은 초기값 0(Job 기본값)과 최종 100뿐이라
        // seenProgress가 항상 {0, 100}이 되어 "중간값을 거친다"는 이 테스트의 전제 자체가 실제 인코딩
        // 속도와 경쟁하는 레이스였다(스로틀 간격과는 무관 — 첫 tick은 스로틀을 무조건 통과한다).
        // 해상도·길이를 올려 재인코딩이 최소 수 초 이상 걸리게 만들면 ffmpeg가 tick을 여러 번(실측 5회,
        // 0.5초 간격) 남기고, 그중 첫 tick부터 이미 0%보다 큰 값이라 폴링(50ms) 주기로도 안정적으로
        // 관측된다 — CPU가 낮은/부하 환경 모두에서 재현 확인.
        java.nio.file.Path inputDir = java.nio.file.Files.createTempDirectory("video-e2e-");
        java.nio.file.Path source = inputDir.resolve("source.mp4");
        Process gen = new ProcessBuilder(
                "ffmpeg", "-y", "-f", "lavfi", "-i", "testsrc=duration=60:size=1280x720:rate=30",
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
