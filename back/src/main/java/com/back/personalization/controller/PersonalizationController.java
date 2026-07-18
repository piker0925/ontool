package com.back.personalization.controller;

import com.back.personalization.dto.PersonalizationMergeRequest;
import com.back.personalization.dto.PersonalizationResponse;
import com.back.personalization.service.PersonalizationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users/me/personalization")
@RequiredArgsConstructor
public class PersonalizationController {

    private final PersonalizationService personalizationService;

    @GetMapping
    public PersonalizationResponse get(@AuthenticationPrincipal Long userId) {
        return personalizationService.getPersonalization(userId);
    }

    @PostMapping("/favorites/{moduleId}")
    public ResponseEntity<Void> addFavorite(@AuthenticationPrincipal Long userId, @PathVariable String moduleId) {
        personalizationService.addFavorite(userId, moduleId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/favorites/{moduleId}")
    public ResponseEntity<Void> removeFavorite(@AuthenticationPrincipal Long userId, @PathVariable String moduleId) {
        personalizationService.removeFavorite(userId, moduleId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/recent-tools/{moduleId}")
    public ResponseEntity<Void> recordRecentTool(@AuthenticationPrincipal Long userId, @PathVariable String moduleId) {
        personalizationService.recordRecentTool(userId, moduleId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/merge")
    public ResponseEntity<Void> merge(@AuthenticationPrincipal Long userId, @RequestBody PersonalizationMergeRequest request) {
        personalizationService.merge(userId, request);
        return ResponseEntity.noContent().build();
    }
}
