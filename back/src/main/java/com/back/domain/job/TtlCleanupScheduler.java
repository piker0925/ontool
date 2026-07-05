package com.back.domain.job;

import com.back.global.storage.FileStorage;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
public class TtlCleanupScheduler {

    private final JobRepository jobRepository;
    private final FileStorage fileStorage;

    @Scheduled(fixedDelayString = "${scheduling.ttl.delay:60000}")
    @Transactional
    public void cleanup() {
        var expired = jobRepository.findAllByExpiresAtBefore(LocalDateTime.now());
        expired.forEach(job -> {
            if (job.getResultKey() != null) {
                fileStorage.delete(job.getResultKey());
            }
        });
        jobRepository.deleteAll(expired);
    }
}
