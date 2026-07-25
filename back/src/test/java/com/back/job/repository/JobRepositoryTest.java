package com.back.job.repository;

import com.back.AbstractMySQLIntegrationTest;
import com.back.job.entity.Job;
import com.back.job.entity.JobStatus;
import com.back.tool.model.Lane;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicReference;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class JobRepositoryTest extends AbstractMySQLIntegrationTest {

    @Autowired
    JobRepository jobRepository;

    @Autowired
    PlatformTransactionManager txManager;

    @Autowired
    JdbcTemplate jdbcTemplate;

    @BeforeEach
    void cleanup() {
        jobRepository.deleteAll();
    }

    /** createdAt은 @PrePersist 전용이라 엔티티 세터로 과거 날짜를 강제할 수 없다 — 저장 후 직접 갱신한다. */
    private void forceCreatedAt(String jobId, LocalDateTime createdAt) {
        jdbcTemplate.update("UPDATE job SET created_at = ? WHERE id = ?", createdAt, jobId);
    }

    @Test
    void job_persistsWithJsonColumns() {
        Job job = new Job();
        job.setModuleId("image-to-pdf");
        job.setStatus(JobStatus.PENDING);
        job.setInputPaths(List.of("/uploads/a.jpg", "/uploads/b.jpg"));
        job.setParams(Map.of("quality", "80"));
        job.setExpiresAt(LocalDateTime.now().plusHours(1));
        jobRepository.save(job);

        Job saved = jobRepository.findById(job.getId()).orElseThrow();
        assertThat(saved.getModuleId()).isEqualTo("image-to-pdf");
        assertThat(saved.getInputPaths()).containsExactly("/uploads/a.jpg", "/uploads/b.jpg");
        assertThat(saved.getParams()).containsEntry("quality", "80");
    }

    @Test
    void skipLocked_preventsDoublePickup() throws InterruptedException {
        Job job = new Job();
        job.setModuleId("test");
        job.setStatus(JobStatus.PENDING);
        job.setInputPaths(List.of());
        job.setExpiresAt(LocalDateTime.now().plusHours(1));
        jobRepository.save(job);

        CountDownLatch acquired = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        AtomicReference<Optional<Job>> thread2Result = new AtomicReference<>();

        Thread thread1 = new Thread(() -> new TransactionTemplate(txManager).execute(status -> {
            jobRepository.findFirstPendingWithLock();
            acquired.countDown();
            try {
                release.await();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            return null;
        }));
        thread1.start();
        acquired.await();

        thread2Result.set(new TransactionTemplate(txManager).execute(
                status -> jobRepository.findFirstPendingWithLock()
        ));
        release.countDown();
        thread1.join();

        assertThat(thread2Result.get()).isEmpty();
    }

    @Test
    void countByLaneAndStatus_지정한_레인과_상태의_작업만_센다() {
        saveJob(Lane.HEAVY, JobStatus.PENDING);
        saveJob(Lane.HEAVY, JobStatus.PENDING);
        saveJob(Lane.VIDEO, JobStatus.PENDING);   // 다른 레인 — 세면 안 됨
        saveJob(Lane.HEAVY, JobStatus.RUNNING);   // 같은 레인 다른 상태 — 세면 안 됨

        // 레인·상태 둘 다 필터해야 2. 상태만 보면 3(HEAVY·VIDEO PENDING), 레인만 보면 3(PENDING·RUNNING).
        assertThat(jobRepository.countByLaneAndStatus(Lane.HEAVY, JobStatus.PENDING)).isEqualTo(2);
    }

    private void saveJob(Lane lane, JobStatus status) {
        Job job = new Job();
        job.setModuleId("image-to-pdf");
        job.setLane(lane);
        job.setStatus(status);
        job.setExpiresAt(LocalDateTime.now().plusHours(1));
        jobRepository.save(job);
    }

    private Job saveJobReturning(Lane lane, JobStatus status) {
        Job job = new Job();
        job.setModuleId("image-to-pdf");
        job.setLane(lane);
        job.setStatus(status);
        job.setExpiresAt(LocalDateTime.now().plusHours(1));
        return jobRepository.save(job);
    }

    @Test
    void countGroupedByLane_상태와_무관하게_레인별_전체_개수를_센다() {
        saveJob(Lane.HEAVY, JobStatus.DONE);
        saveJob(Lane.HEAVY, JobStatus.PENDING); // 상태는 달라도 같은 레인이면 합산돼야 함
        saveJob(Lane.VIDEO, JobStatus.RUNNING);

        Map<Lane, Long> counts = jobRepository.countGroupedByLane().stream()
                .collect(Collectors.toMap(JobRepository.LaneCount::getLane, JobRepository.LaneCount::getCount));

        assertThat(counts).containsEntry(Lane.HEAVY, 2L).containsEntry(Lane.VIDEO, 1L);
    }

    @Test
    void countGroupedByDateAndStatusSince_날짜와_상태로_그룹핑하고_진행중_상태와_범위밖_날짜는_제외한다() {
        LocalDate today = LocalDate.now();

        Job doneYesterday1 = saveJobReturning(Lane.HEAVY, JobStatus.DONE);
        Job doneYesterday2 = saveJobReturning(Lane.HEAVY, JobStatus.DONE); // 같은 (날짜,상태) 버킷 — 합산돼야 함
        Job failedYesterday = saveJobReturning(Lane.HEAVY, JobStatus.FAILED); // 같은 날짜, 다른 상태 — 따로 집계돼야 함
        Job doneToday = saveJobReturning(Lane.VIDEO, JobStatus.DONE);
        Job pendingToday = saveJobReturning(Lane.HEAVY, JobStatus.PENDING); // 아직 결과 미확정 — 제외돼야 함
        Job doneTooOld = saveJobReturning(Lane.HEAVY, JobStatus.DONE); // 조회 범위 밖 — 제외돼야 함

        forceCreatedAt(doneYesterday1.getId(), today.minusDays(1).atTime(9, 0));
        forceCreatedAt(doneYesterday2.getId(), today.minusDays(1).atTime(20, 0));
        forceCreatedAt(failedYesterday.getId(), today.minusDays(1).atTime(10, 0));
        forceCreatedAt(doneToday.getId(), today.atTime(8, 0));
        forceCreatedAt(pendingToday.getId(), today.atTime(8, 30));
        forceCreatedAt(doneTooOld.getId(), today.minusDays(10).atTime(9, 0));

        List<JobRepository.DailyStatusCount> rows =
                jobRepository.countGroupedByDateAndStatusSince(today.minusDays(3).atStartOfDay());

        assertThat(rows).extracting(JobRepository.DailyStatusCount::getStatus)
                .doesNotContain(JobStatus.PENDING, JobStatus.RUNNING);
        assertThat(rows).noneMatch(r -> r.getDate().equals(today.minusDays(10)));

        var yesterdayDone = rows.stream()
                .filter(r -> r.getDate().equals(today.minusDays(1)) && r.getStatus() == JobStatus.DONE)
                .findFirst().orElseThrow();
        assertThat(yesterdayDone.getCount()).isEqualTo(2L);

        var yesterdayFailed = rows.stream()
                .filter(r -> r.getDate().equals(today.minusDays(1)) && r.getStatus() == JobStatus.FAILED)
                .findFirst().orElseThrow();
        assertThat(yesterdayFailed.getCount()).isEqualTo(1L);

        var todayDone = rows.stream()
                .filter(r -> r.getDate().equals(today) && r.getStatus() == JobStatus.DONE)
                .findFirst().orElseThrow();
        assertThat(todayDone.getCount()).isEqualTo(1L);
    }
}
