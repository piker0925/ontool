package com.back.job.controller;

import com.back.global.response.PageResponse;
import com.back.global.storage.FileStorage;
import com.back.job.dto.JobHistoryResponse;
import com.back.job.entity.Job;
import com.back.job.service.JobService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users/me/jobs")
@RequiredArgsConstructor
public class JobHistoryController {

    private final JobService jobService;
    private final FileStorage fileStorage;

    @GetMapping
    public PageResponse<JobHistoryResponse> get(@AuthenticationPrincipal Long userId,
                                                @RequestParam(defaultValue = "0") int page,
                                                @RequestParam(defaultValue = "20") int size) {
        var jobs = jobService.findByUserId(userId, PageRequest.of(page, size)).map(this::toHistory);
        return PageResponse.of(jobs);
    }

    private JobHistoryResponse toHistory(Job job) {
        boolean expired = jobService.isExpired(job);
        String downloadUrl = (!expired && job.getResultKey() != null)
                ? fileStorage.getUrl(job.getResultKey())
                : null;
        return new JobHistoryResponse(job.getId(), job.getModuleId(), job.getStatus().name(),
                job.getCreatedAt(), expired, downloadUrl);
    }
}
