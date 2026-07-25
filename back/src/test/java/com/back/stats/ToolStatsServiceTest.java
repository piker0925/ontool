package com.back.stats;

import com.back.AbstractMySQLIntegrationTest;
import com.back.job.entity.Job;
import com.back.job.entity.JobStatus;
import com.back.job.repository.JobRepository;
import com.back.stats.entity.ToolStats;
import com.back.stats.repository.ToolStatsRepository;
import com.back.stats.service.ToolStatsService;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import jakarta.persistence.EntityManagerFactory;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("local")
@TestPropertySource(properties = {
        "storage.upload-dir=build/test-uploads",
        "scheduling.worker.delay=60000",
        "scheduling.ttl.delay=60000",
        "spring.jpa.properties.hibernate.generate_statistics=true"
})
class ToolStatsServiceTest extends AbstractMySQLIntegrationTest {

    @Autowired
    ToolStatsService toolStatsService;

    @Autowired
    ToolStatsRepository toolStatsRepository;

    @Autowired
    JobRepository jobRepository;

    @Autowired
    EntityManagerFactory entityManagerFactory;

    @BeforeEach
    void cleanUp() {
        toolStatsRepository.deleteAll();
        jobRepository.deleteAll();
    }

    @Test
    void getOrCreate_newModule_createsWithZeroCounts() {
        ToolStats stats = toolStatsService.getOrCreate("sql-formatter");

        assertThat(stats.getModuleId()).isEqualTo("sql-formatter");
        assertThat(stats.getUseCount()).isZero();
        assertThat(stats.getLikeCount()).isZero();
    }

    @Test
    void getOrCreate_existingModule_returnsSame() {
        toolStatsService.getOrCreate("sql-formatter");
        toolStatsService.incrementUseCount("sql-formatter");

        ToolStats stats = toolStatsService.getOrCreate("sql-formatter");

        assertThat(toolStatsRepository.findAll()).hasSize(1);
        assertThat(stats.getUseCount()).isEqualTo(1);
    }

    @Test
    void incrementUseCount_increasesCount() {
        toolStatsService.incrementUseCount("sql-formatter");
        toolStatsService.incrementUseCount("sql-formatter");

        ToolStats stats = toolStatsService.getOrCreate("sql-formatter");
        assertThat(stats.getUseCount()).isEqualTo(2);
    }

    @Test
    void incrementLikeCount_increasesCount() {
        toolStatsService.incrementLikeCount("sql-formatter");
        toolStatsService.incrementLikeCount("sql-formatter");

        ToolStats stats = toolStatsService.getOrCreate("sql-formatter");
        assertThat(stats.getLikeCount()).isEqualTo(2);
        assertThat(stats.getUseCount()).isZero();
    }

    @Test
    void decrementLikeCount_decreasesOnlyTargetModule() {
        toolStatsService.incrementLikeCount("sql-formatter");
        toolStatsService.incrementLikeCount("sql-formatter");
        toolStatsService.incrementLikeCount("cron"); // 다른 모듈은 영향받지 않아야 한다

        toolStatsService.decrementLikeCount("sql-formatter");

        assertThat(toolStatsService.getOrCreate("sql-formatter").getLikeCount()).isEqualTo(1);
        assertThat(toolStatsService.getOrCreate("cron").getLikeCount()).isEqualTo(1);
    }

    @Test
    void decrementLikeCount_neverGoesBelowZero() {
        toolStatsService.incrementLikeCount("sql-formatter");

        toolStatsService.decrementLikeCount("sql-formatter");
        toolStatsService.decrementLikeCount("sql-formatter");
        toolStatsService.decrementLikeCount("sql-formatter");

        assertThat(toolStatsService.getOrCreate("sql-formatter").getLikeCount()).isZero();
    }

    @Test
    void incrementUseCount_concurrentRequests_noLostUpdate() throws Exception {
        int threads = 20;
        var failures = new java.util.concurrent.CopyOnWriteArrayList<Throwable>();
        try (var executor = java.util.concurrent.Executors.newFixedThreadPool(threads)) {
            var latch = new java.util.concurrent.CountDownLatch(threads);
            for (int i = 0; i < threads; i++) {
                executor.submit(() -> {
                    try {
                        toolStatsService.incrementUseCount("sql-formatter");
                    } catch (Throwable t) {
                        failures.add(t);
                    } finally {
                        latch.countDown();
                    }
                });
            }
            latch.await();
        }

        assertThat(failures).isEmpty();
        assertThat(toolStatsService.getOrCreate("sql-formatter").getUseCount()).isEqualTo(threads);
    }

    /**
     * 관리자 통계 화면(/admin/stats)은 모듈마다 실패 건수를 조회해야 한다. 모듈마다 따로 조회하면
     * N+1이 되므로, 모듈 개수와 무관하게 배치(그룹핑) 쿼리 1번으로 끝나야 한다(109).
     * 모듈 1개짜리 케이스만으로는 "정말 배치인지"(패턴 B)를 증명할 수 없으므로, 모듈 5개 케이스와
     * 1개 케이스의 실행 쿼리 수를 직접 비교해 N에 비례해 늘지 않는다는 것까지 확인한다.
     */
    @Test
    void getFailCounts_모듈_개수와_무관하게_실행되는_쿼리_수가_늘지_않는다() {
        saveJob("batch-fail-1", JobStatus.FAILED);
        saveJob("batch-fail-1", JobStatus.FAILED);
        saveJob("batch-fail-1", JobStatus.DONE);
        saveJob("batch-fail-2", JobStatus.FAILED);
        saveJob("batch-fail-3", JobStatus.DONE); // FAILED 없음
        saveJob("batch-fail-4", JobStatus.DONE); // FAILED 없음
        saveJob("batch-fail-5", JobStatus.FAILED);
        saveJob("batch-fail-5", JobStatus.FAILED);
        saveJob("batch-fail-5", JobStatus.FAILED);

        List<String> fiveModuleIds = List.of(
                "batch-fail-1", "batch-fail-2", "batch-fail-3", "batch-fail-4", "batch-fail-5");
        List<String> oneModuleId = List.of("batch-fail-1");

        Statistics statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();

        statistics.clear();
        Map<String, Long> fiveModuleResult = toolStatsService.getFailCounts(fiveModuleIds);
        long statementsForFive = statistics.getPrepareStatementCount();

        statistics.clear();
        toolStatsService.getFailCounts(oneModuleId);
        long statementsForOne = statistics.getPrepareStatementCount();

        // 값 정합성: 모듈별 실제 FAILED 건수와 일치해야 한다(개수만 세는 게 아니라 내용 검증).
        assertThat(fiveModuleResult).containsEntry("batch-fail-1", 2L);
        assertThat(fiveModuleResult).containsEntry("batch-fail-2", 1L);
        assertThat(fiveModuleResult).containsEntry("batch-fail-5", 3L);
        assertThat(fiveModuleResult.getOrDefault("batch-fail-3", 0L)).isZero();
        assertThat(fiveModuleResult.getOrDefault("batch-fail-4", 0L)).isZero();

        // 쿼리 수: 모듈이 5개든 1개든 딱 1번(그룹핑 쿼리 1번)만 실행돼야 한다.
        // N+1이면 모듈 5개일 때 5번(+findAll 등) 나가 statementsForOne보다 커진다.
        assertThat(statementsForOne).isEqualTo(1L);
        assertThat(statementsForFive).isEqualTo(statementsForOne);
    }

    private void saveJob(String moduleId, JobStatus status) {
        Job job = new Job();
        job.setModuleId(moduleId);
        job.setStatus(status);
        job.setExpiresAt(LocalDateTime.now().plusHours(1));
        jobRepository.save(job);
    }
}
