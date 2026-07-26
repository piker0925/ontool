package com.back.stats.controller;

import com.back.personalization.service.PersonalizationService;
import com.back.stats.dto.ToolStatsResponse;
import com.back.stats.service.ToolStatsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/tools/{moduleId}")
@RequiredArgsConstructor
@Tag(name = "도구 통계 (Tool Stats)", description = "도구별 사용 횟수·좋아요 통계 조회 및 좋아요 API")
public class ToolStatsController {

    private final ToolStatsService toolStatsService;
    private final PersonalizationService personalizationService;

    @Operation(summary = "도구 통계 조회", description = "지정한 도구 모듈의 사용 횟수·좋아요 수를 조회합니다.")
    @GetMapping("/stats")
    public ToolStatsResponse getStats(@Parameter(description = "도구 모듈 ID") @PathVariable String moduleId) {
        return ToolStatsResponse.from(toolStatsService.getOrCreate(moduleId));
    }

    // 프론트 전용(순수 클라이언트 계산) 도구는 백엔드 실행 API(/run, /upload)를 타지 않아
    // useCount가 증가할 방법이 없다 — 프론트가 도구 페이지 최초 진입 시 1회 호출한다.
    @Operation(summary = "도구 사용 횟수 증가", description = "프론트 전용 도구처럼 백엔드 실행 API를 타지 않는 도구의 사용 횟수를 프론트가 진입 시 직접 증가시킵니다.")
    @PostMapping("/use")
    public ToolStatsResponse markUsed(@Parameter(description = "도구 모듈 ID") @PathVariable String moduleId) {
        toolStatsService.incrementUseCount(moduleId);
        return ToolStatsResponse.from(toolStatsService.getOrCreate(moduleId));
    }

    @Operation(summary = "도구 좋아요", description = "지정한 도구 모듈에 좋아요를 남깁니다. 로그인 회원은 유저당 1회만 반영되고, 비로그인은 전역 카운터만 증가합니다.")
    @PostMapping("/like")
    public ToolStatsResponse like(@Parameter(description = "도구 모듈 ID") @PathVariable String moduleId, @AuthenticationPrincipal Long userId) {
        // 비로그인은 기존 동작 그대로(전역 카운터만, 소유권 추적 없음) — 로그인은 유저당 1회만 반영.
        if (userId == null || personalizationService.likeIfAbsent(userId, moduleId)) {
            toolStatsService.incrementLikeCount(moduleId);
        }
        return ToolStatsResponse.from(toolStatsService.getOrCreate(moduleId));
    }

    @Operation(summary = "도구 좋아요 취소", description = "지정한 도구 모듈에 남긴 좋아요를 취소합니다.")
    @DeleteMapping("/like")
    public ToolStatsResponse unlike(@Parameter(description = "도구 모듈 ID") @PathVariable String moduleId, @AuthenticationPrincipal Long userId) {
        if (userId == null || personalizationService.unlikeIfPresent(userId, moduleId)) {
            toolStatsService.decrementLikeCount(moduleId);
        }
        return ToolStatsResponse.from(toolStatsService.getOrCreate(moduleId));
    }
}
