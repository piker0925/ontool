package com.back.job.service;

import com.back.global.storage.FileStorage;
import com.back.job.repository.JobRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.Comparator;

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
            // 결과 파일 삭제
            if (job.getResultKey() != null) {
                fileStorage.delete(job.getResultKey());
            }
            // 업로드 임시 파일 삭제 (uploads/temp/{tempId}/)
            if (job.getInputPaths() != null) {
                job.getInputPaths().stream()
                        .map(Path::of)
                        .map(p -> p.getParent()) // tempId 디렉토리
                        .distinct()
                        .forEach(this::deleteDir);
            }
        });
        jobRepository.deleteAll(expired);
    }

    private void deleteDir(Path dir) {
        if (dir == null || !Files.exists(dir)) return;
        try {
            Files.walk(dir)
                    .sorted(Comparator.reverseOrder())
                    .forEach(p -> { try { Files.delete(p); } catch (IOException ignored) {} });
        } catch (IOException ignored) {}
    }
}
