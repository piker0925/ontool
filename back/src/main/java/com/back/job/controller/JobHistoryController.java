package com.back.job.controller;

import com.back.global.response.PageResponse;
import com.back.global.storage.FileStorage;
import com.back.job.dto.JobHistoryResponse;
import com.back.job.entity.Job;
import com.back.job.service.JobService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@Tag(name = "작업 이력 (Job History)", description = "로그인한 회원의 과거 작업(Job) 이력 조회 API")
public class JobHistoryController {

    private final JobService jobService;
    private final FileStorage fileStorage;

    @Operation(summary = "내 작업 이력 조회", description = "로그인한 회원이 생성한 Job 목록을 최신순으로 페이지네이션하여 조회합니다. 결과 파일이 만료된 경우 다운로드 URL은 내려가지 않습니다.")
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
