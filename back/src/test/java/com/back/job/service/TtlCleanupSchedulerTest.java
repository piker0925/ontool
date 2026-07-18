package com.back.job.service;

import com.back.AbstractMySQLIntegrationTest;
import com.back.job.entity.Job;
import com.back.job.entity.JobStatus;
import com.back.job.repository.JobRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("local")
@TestPropertySource(properties = {
        "storage.upload-dir=build/test-uploads",
        "scheduling.worker.delay=60000",
        "scheduling.ttl.delay=60000"
})
class TtlCleanupSchedulerTest extends AbstractMySQLIntegrationTest {

    @Autowired
    TtlCleanupScheduler ttlCleanupScheduler;
    @Autowired
    JobRepository jobRepository;

    @Test
    void 만료된_익명_Job은_row까지_삭제된다() {
        Job anonymous = new Job();
        anonymous.setModuleId("sha256");
        anonymous.setStatus(JobStatus.DONE);
        anonymous.setExpiresAt(LocalDateTime.now().minusMinutes(1));
        Job saved = jobRepository.save(anonymous);

        ttlCleanupScheduler.cleanup();

        assertThat(jobRepository.findById(saved.getId())).isEmpty();
    }

    @Test
    void 만료된_회원_Job은_row가_보존된다() {
        Job memberJob = new Job();
        memberJob.setModuleId("sha256");
        memberJob.setStatus(JobStatus.DONE);
        memberJob.setUserId(999L);
        memberJob.setExpiresAt(LocalDateTime.now().minusMinutes(1));
        Job saved = jobRepository.save(memberJob);

        ttlCleanupScheduler.cleanup();

        assertThat(jobRepository.findById(saved.getId())).isPresent();
    }
}
