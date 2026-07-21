package com.back.job.service;

import com.back.AbstractMySQLIntegrationTest;
import com.back.global.storage.FileStorage;
import com.back.job.entity.Job;
import com.back.job.entity.JobStatus;
import com.back.job.repository.JobRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static java.util.concurrent.TimeUnit.SECONDS;
import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

/**
 * 디스크 사용량이 상한선(106/ADR-0033)을 넘으면 오래된 완료 작업부터 조기 만료되어, 다음 청소 틱에
 * 회수되는지 검증한다. 상한선을 "옛 파일 + 새 파일" 합보다 작고 "새 파일 하나"보다는 크게 잡아,
 * 옛 파일 하나만 치우면 다시 상한선 아래로 내려가게 해 "가장 오래된 것부터만" 치우는지(전부 지우는
 * 구현과 구분) 결정론적으로 확인한다.
 */
@SpringBootTest
@ActiveProfiles("local")
@TestPropertySource(properties = {
        "storage.upload-dir=build/test-uploads-eviction",
        "scheduling.ttl.delay=200",
        "storage.high-water-mark-bytes=3000",
        "storage.eviction-batch-size=1"
})
class TtlCleanupSchedulerEvictionTest extends AbstractMySQLIntegrationTest {

    @Autowired
    JobRepository jobRepository;
    @Autowired
    FileStorage fileStorage;

    private static final Path UPLOAD_DIR = Path.of("build/test-uploads-eviction");

    @BeforeEach
    void cleanUp() throws Exception {
        jobRepository.deleteAll();
        if (Files.exists(UPLOAD_DIR)) {
            try (var walk = Files.walk(UPLOAD_DIR)) {
                walk.sorted(java.util.Comparator.reverseOrder()).forEach(p -> {
                    try {
                        Files.deleteIfExists(p);
                    } catch (Exception ignored) {
                    }
                });
            }
        }
    }

    private Job doneJobWithResultFile(String key, int bytes) throws Exception {
        Path tmp = Files.createTempFile("evict-", ".bin");
        Files.write(tmp, new byte[bytes]);
        fileStorage.save(key, tmp);
        Files.deleteIfExists(tmp);

        Job job = new Job();
        job.setModuleId("echo");
        job.setStatus(JobStatus.DONE);
        job.setInputPaths(List.of());
        job.setParams(Map.of());
        job.setResultKey(key);
        job.setExpiresAt(LocalDateTime.now().plusHours(1));
        return jobRepository.save(job);
    }

    @Test
    void 디스크_사용량이_상한선을_넘으면_가장_오래된_완료작업만_조기_만료된다() throws Exception {
        Job oldJob = doneJobWithResultFile("old-result.bin", 2000);
        Thread.sleep(50); // createdAt 순서를 보장하기 위한 최소 간격
        Job newJob = doneJobWithResultFile("new-result.bin", 2000);

        // 옛 job만 제거되면 사용량이 상한선(3000) 아래로 내려가 새 job은 이후 틱에서도 안전해야 한다.
        await().atMost(10, SECONDS).until(() -> jobRepository.findById(oldJob.getId()).isEmpty());

        // 여러 틱이 더 지나도(200ms 주기) 새 job은 살아남는다 — "가장 오래된 것만" 치웠다는 증거.
        Thread.sleep(1000);
        assertThat(jobRepository.findById(newJob.getId())).isPresent();
    }
}
