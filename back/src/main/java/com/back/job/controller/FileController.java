package com.back.job.controller;

import com.back.global.exception.AppException;
import com.back.global.exception.ErrorCode;
import com.back.job.service.JobService;
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

        // 다운로드 파일명: 저장 키(jobId/result.ext)는 그대로 두고, 표시명만 원본 입력 파일명 기반으로
        // 만든다(112) — 저장 키→원본 파일명 매핑은 JobService가 아는 지식이라 그쪽에 위임한다.
        String filename = jobService.displayFilenameFor(key, filePath.getFileName().toString());

        HttpHeaders headers = new HttpHeaders();
        headers.setContentDisposition(
                ContentDisposition.attachment()
                        .filename(filename, StandardCharsets.UTF_8)
                        .build());

        return ResponseEntity.ok()
                .headers(headers)
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(new FileSystemResource(filePath));
    }
}
