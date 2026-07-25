package com.back.job.controller;

import com.back.global.exception.AppException;
import com.back.global.exception.ErrorCode;
import com.back.job.entity.Job;
import com.back.job.service.JobService;
import com.back.job.service.ZipEntryNamer;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

@RestController
public class FileController {

    private final Path uploadDir;
    private final JobService jobService;

    public FileController(@Value("${storage.upload-dir:uploads}") String uploadDir, JobService jobService) {
        this.uploadDir = Path.of(uploadDir).toAbsolutePath();
        this.jobService = jobService;
    }

    @GetMapping("/api/v1/files/**")
    public ResponseEntity<FileSystemResource> getFile(HttpServletRequest request) {
        String key = request.getRequestURI().substring("/api/v1/files/".length());
        Path filePath = uploadDir.resolve(key).normalize();

        if (!filePath.startsWith(uploadDir)) {
            return ResponseEntity.notFound().build();
        }

        if (!Files.exists(filePath)) {
            throw new AppException(ErrorCode.NOT_FOUND);
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentDisposition(
                ContentDisposition.attachment()
                        .filename(displayFilenameFor(key, filePath), StandardCharsets.UTF_8)
                        .build());

        return ResponseEntity.ok()
                .headers(headers)
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(new FileSystemResource(filePath));
    }

    /**
     * 다운로드 파일명: 저장 키(jobId/result.ext)는 그대로 두고, 표시명만 원본 입력 파일명 기반으로 만든다
     * (112) — 038의 {@link ZipEntryNamer}(정화·Zip Slip 방지 포함)를 그대로 재사용한다. 이 라우트로 오는
     * 키는 항상 job 결과이지만(현재 유일한 fileStorage.save 호출부가 JobWorker뿐), job을 못 찾거나
     * 원본 입력이 없으면 저장 키의 파일명 그대로 폴백한다.
     */
    private String displayFilenameFor(String key, Path filePath) {
        String fallback = filePath.getFileName().toString();
        int sep = key.indexOf('/');
        if (sep < 0) {
            return fallback;
        }
        String jobId = key.substring(0, sep);
        return jobService.findOptional(jobId)
                .map(Job::firstInputPath)
                .filter(input -> !input.isEmpty())
                .map(input -> new ZipEntryNamer().nameFor(input, key))
                .orElse(fallback);
    }
}
