package com.back.job.controller;

import com.back.global.exception.AppException;
import com.back.global.exception.ErrorCode;
import com.back.global.storage.FileStorage;
import com.back.job.dto.BatchProgressResponse;
import com.back.job.entity.Job;
import com.back.job.entity.JobStatus;
import com.back.job.repository.BatchStats;
import com.back.job.service.JobService;
import com.back.job.service.ZipEntryNamer;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.io.InputStream;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@RestController
@RequestMapping("/api/v1/batches")
@RequiredArgsConstructor
public class BatchController {

    private final JobService jobService;
    private final FileStorage fileStorage;

    @GetMapping("/{id}")
    public BatchProgressResponse getProgress(@PathVariable String id) {
        BatchStats stats = jobService.getBatchStats(id);
        if (stats.getTotal() == 0) {
            throw new AppException(ErrorCode.JOB_NOT_FOUND);
        }
        return new BatchProgressResponse(id, stats.getTotal(), stats.getDoneCount(), stats.getFailCount());
    }

    @GetMapping("/{id}/result")
    public ResponseEntity<StreamingResponseBody> getResult(@PathVariable String id) {
        List<Job> doneJobs = jobService.getBatchJobs(id).stream()
                .filter(j -> j.getStatus() == JobStatus.DONE && j.getResultKey() != null)
                .toList();

        StreamingResponseBody body = out -> {
            try (ZipOutputStream zip = new ZipOutputStream(out)) {
                // 엔트리명: 원본 파일명 + 결과 확장자, 충돌 -N, 정화(Zip Slip 방지) — 038. UUID 폴더 제거.
                ZipEntryNamer namer = new ZipEntryNamer();
                for (Job job : doneJobs) {
                    String key = job.getResultKey();
                    zip.putNextEntry(new ZipEntry(namer.nameFor(firstInputPath(job), key)));
                    try (InputStream in = fileStorage.openStream(key)) {
                        in.transferTo(zip);
                    }
                    zip.closeEntry();
                }
            }
        };

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=batch-" + id + ".zip")
                .body(body);
    }

    private static String firstInputPath(Job job) {
        List<String> inputs = job.getInputPaths();
        return (inputs == null || inputs.isEmpty()) ? "" : inputs.get(0);
    }
}
