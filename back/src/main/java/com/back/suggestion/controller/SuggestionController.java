package com.back.suggestion.controller;

import com.back.suggestion.entity.Suggestion;
import com.back.suggestion.service.SuggestionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/suggestions")
@RequiredArgsConstructor
@Tag(name = "건의사항 (Suggestion)", description = "새 도구·기능 건의사항 제출 API")
public class SuggestionController {

    private final SuggestionService suggestionService;

    @Operation(summary = "건의사항 제출", description = "새 도구나 기능에 대한 건의사항을 제출합니다. 비로그인 사용자도 제출할 수 있습니다.")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Long> addSuggestion(@RequestBody Map<String, String> body) {
        Suggestion suggestion = suggestionService.addSuggestion(body.get("content"));
        return Map.of("id", suggestion.getId());
    }
}
