package com.back.job.controller;

import com.back.AbstractMySQLIntegrationTest;
import com.back.job.entity.Job;
import com.back.job.entity.JobStatus;
import com.back.job.repository.JobRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.time.LocalDateTime;

import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 050에서 회원 Job row가 TTL 만료 후에도 보존되면서(TtlCleanupScheduler),
 * 기존 /result 엔드포인트가 이미 삭제된 파일의 URL을 그대로 내려주던 회귀를 막는 테스트.
 */
@SpringBootTest
@ActiveProfiles("local")
@TestPropertySource(properties = {
        "storage.upload-dir=build/test-uploads",
        "scheduling.worker.delay=60000",
        "scheduling.ttl.delay=60000"
})
class JobControllerExpiryTest extends AbstractMySQLIntegrationTest {

    @Autowired
    WebApplicationContext wac;
    @Autowired
    JobRepository jobRepository;

    MockMvc mockMvc;

    @BeforeEach
    void setup() {
        jobRepository.deleteAll();
        mockMvc = MockMvcBuilders.webAppContextSetup(wac).build();
    }

    @Test
    void 만료된_회원_Job은_파일이_이미_지워졌으므로_다운로드URL_대신_null을_반환한다() throws Exception {
        Job job = saveJob(1L, "result-key-expired", LocalDateTime.now().minusHours(1), "advisory text");

        mockMvc.perform(get("/api/v1/jobs/" + job.getId() + "/result"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.url").value(nullValue()))
                .andExpect(jsonPath("$.text").value("advisory text"));
    }

    @Test
    void 만료전_회원_Job은_그대로_다운로드URL을_반환한다() throws Exception {
        Job job = saveJob(1L, "result-key-fresh", LocalDateTime.now().plusHours(1), null);

        mockMvc.perform(get("/api/v1/jobs/" + job.getId() + "/result"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.url").isNotEmpty());
    }

    private Job saveJob(Long userId, String resultKey, LocalDateTime expiresAt, String resultText) {
        Job job = new Job();
        job.setUserId(userId);
        job.setModuleId("sha256");
        job.setStatus(JobStatus.DONE);
        job.setResultKey(resultKey);
        job.setResultText(resultText);
        job.setExpiresAt(expiresAt);
        return jobRepository.save(job);
    }
}
