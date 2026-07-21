package com.back.stats.controller;

import com.back.personalization.service.PersonalizationService;
import com.back.stats.dto.ToolStatsResponse;
import com.back.stats.service.ToolStatsService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/tools/{moduleId}")
@RequiredArgsConstructor
public class ToolStatsController {

    private final ToolStatsService toolStatsService;
    private final PersonalizationService personalizationService;

    @GetMapping("/stats")
    public ToolStatsResponse getStats(@PathVariable String moduleId) {
        return ToolStatsResponse.from(toolStatsService.getOrCreate(moduleId));
    }

    // 프론트 전용(순수 클라이언트 계산) 도구는 백엔드 실행 API(/run, /upload)를 타지 않아
    // useCount가 증가할 방법이 없다 — 프론트가 도구 페이지 최초 진입 시 1회 호출한다.
    @PostMapping("/use")
    public ToolStatsResponse markUsed(@PathVariable String moduleId) {
        toolStatsService.incrementUseCount(moduleId);
        return ToolStatsResponse.from(toolStatsService.getOrCreate(moduleId));
    }

    @PostMapping("/like")
    public ToolStatsResponse like(@PathVariable String moduleId, @AuthenticationPrincipal Long userId) {
        // 비로그인은 기존 동작 그대로(전역 카운터만, 소유권 추적 없음) — 로그인은 유저당 1회만 반영.
        if (userId == null || personalizationService.likeIfAbsent(userId, moduleId)) {
            toolStatsService.incrementLikeCount(moduleId);
        }
        return ToolStatsResponse.from(toolStatsService.getOrCreate(moduleId));
    }

    @DeleteMapping("/like")
    public ToolStatsResponse unlike(@PathVariable String moduleId, @AuthenticationPrincipal Long userId) {
        if (userId == null || personalizationService.unlikeIfPresent(userId, moduleId)) {
            toolStatsService.decrementLikeCount(moduleId);
        }
        return ToolStatsResponse.from(toolStatsService.getOrCreate(moduleId));
    }
}
