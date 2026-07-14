package com.back.job.repository;

import com.back.AbstractMySQLIntegrationTest;
import com.back.job.entity.Job;
import com.back.job.entity.JobStatus;
import com.back.tool.model.Lane;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class JobRepositoryTest extends AbstractMySQLIntegrationTest {

    @Autowired
    JobRepository jobRepository;

    @Autowired
    PlatformTransactionManager txManager;

    @BeforeEach
    void cleanup() {
        jobRepository.deleteAll();
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
}
