package com.back.comment.controller;

import com.back.comment.dto.CommentReportRequest;
import com.back.comment.service.CommentReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * 댓글 신고(099) — 로그인 유저만 가능(SecurityConfig에서 authenticated() 강제, 여기선 userId가 null일 수 없다).
 * /api/v1/comments/{id}와 별도 관심사라 CommentDeleteController와 마찬가지로 컨트롤러를 분리한다.
 */
@RestController
@RequestMapping("/api/v1/comments")
@RequiredArgsConstructor
public class CommentReportController {

    private final CommentReportService commentReportService;

    @PostMapping("/{id}/report")
    @ResponseStatus(HttpStatus.CREATED)
    public void report(@PathVariable Long id,
                        @Valid @RequestBody CommentReportRequest request,
                        @AuthenticationPrincipal Long userId) {
        commentReportService.report(id, userId, request.reason(), request.detail());
    }
}
