package com.back.personalization.controller;

import com.back.personalization.dto.PersonalizationMergeRequest;
import com.back.personalization.dto.PersonalizationResponse;
import com.back.personalization.service.PersonalizationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users/me/personalization")
@RequiredArgsConstructor
@Tag(name = "개인화 (Personalization)", description = "로그인 회원의 즐겨찾기·최근 사용 도구·비로그인 데이터 병합 API")
public class PersonalizationController {

    private final PersonalizationService personalizationService;

    @Operation(summary = "개인화 데이터 조회", description = "로그인한 회원의 즐겨찾기 도구, 최근 사용 도구 목록을 조회합니다.")
    @GetMapping
    public PersonalizationResponse get(@AuthenticationPrincipal Long userId) {
        return personalizationService.getPersonalization(userId);
    }

    @Operation(summary = "즐겨찾기 추가", description = "지정한 도구 모듈을 로그인 회원의 즐겨찾기에 추가합니다.")
    @PostMapping("/favorites/{moduleId}")
    public ResponseEntity<Void> addFavorite(@AuthenticationPrincipal Long userId,
                                             @Parameter(description = "도구 모듈 ID") @PathVariable String moduleId) {
        personalizationService.addFavorite(userId, moduleId);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "즐겨찾기 제거", description = "지정한 도구 모듈을 로그인 회원의 즐겨찾기에서 제거합니다.")
    @DeleteMapping("/favorites/{moduleId}")
    public ResponseEntity<Void> removeFavorite(@AuthenticationPrincipal Long userId,
                                                @Parameter(description = "도구 모듈 ID") @PathVariable String moduleId) {
        personalizationService.removeFavorite(userId, moduleId);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "최근 사용 도구 기록", description = "지정한 도구 모듈을 로그인 회원의 최근 사용 목록에 기록합니다.")
    @PostMapping("/recent-tools/{moduleId}")
    public ResponseEntity<Void> recordRecentTool(@AuthenticationPrincipal Long userId,
                                                  @Parameter(description = "도구 모듈 ID") @PathVariable String moduleId) {
        personalizationService.recordRecentTool(userId, moduleId);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "비로그인 개인화 데이터 병합", description = "로그인 전 브라우저(localStorage)에 쌓인 즐겨찾기·최근 사용 도구를 로그인 회원 계정으로 병합합니다.")
    @PostMapping("/merge")
    public ResponseEntity<Void> merge(@AuthenticationPrincipal Long userId, @RequestBody PersonalizationMergeRequest request) {
        personalizationService.merge(userId, request);
        return ResponseEntity.noContent().build();
    }
}
