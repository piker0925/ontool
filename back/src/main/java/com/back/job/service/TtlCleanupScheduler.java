package com.back.job.service;

import com.back.global.storage.FileStorage;
import com.back.global.storage.OrphanFileSweeper;
import com.back.job.repository.JobRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.Path;
import java.time.Duration;
import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
public class TtlCleanupScheduler {

    private final JobRepository jobRepository;
    private final FileStorage fileStorage;
    private final OrphanFileSweeper fileSweeper;

    @Value("${storage.upload-dir:uploads}")
    private String uploadDir;

    @Value("${storage.result-ttl}")
    private Duration resultTtl;

    @Scheduled(fixedDelayString = "${scheduling.ttl.delay:60000}")
    @Transactional
    public void cleanup() {
        // 1) 만료된 Job의 결과·입력 파일은 회원·익명 무관 전부 삭제.
        //    row는 익명 Job만 삭제 — 회원 Job은 작업 이력(050)으로 영구 보존한다.
        var expired = jobRepository.findAllByExpiresAtBefore(LocalDateTime.now());
        expired.forEach(job -> {
            if (job.getResultKey() != null) {
                fileStorage.delete(job.getResultKey());
            }
            job.inputTempDirs().forEach(fileSweeper::deleteRecursively);
        });
        jobRepository.deleteAll(expired.stream().filter(job -> job.getUserId() == null).toList());

        // 2) 안전망: Job row에 묶이지 않은 고아 파일을 mtime 기준으로 청소
        //    (업로드 후 Job 생성 실패, 로컬 create-drop 등으로 참조를 잃은 파일)
        fileSweeper.sweep(Path.of(uploadDir), resultTtl);
    }
}
