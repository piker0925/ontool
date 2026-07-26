package com.back.comment.controller;

import com.back.comment.dto.CommentCreateRequest;
import com.back.comment.dto.CommentResponse;
import com.back.comment.service.CommentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/tools/{moduleId}/comments")
@RequiredArgsConstructor
@Tag(name = "댓글 (Comment)", description = "도구별 댓글 조회·작성·삭제·신고 API")
public class CommentController {

    private final CommentService commentService;

    @Operation(summary = "도구 댓글 목록 조회", description = "지정한 도구 모듈에 달린 댓글 목록을 조회합니다.")
    @GetMapping
    public List<CommentResponse> getComments(@Parameter(description = "도구 모듈 ID") @PathVariable String moduleId) {
        return commentService.getCommentResponses(moduleId);
    }

    @Operation(summary = "도구 댓글 작성", description = "로그인한 회원이 지정한 도구 모듈에 댓글을 작성합니다.")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CommentResponse addComment(@Parameter(description = "도구 모듈 ID") @PathVariable String moduleId,
                                     @RequestBody CommentCreateRequest request,
                                     @AuthenticationPrincipal Long userId) {
        return commentService.addCommentAndRespond(moduleId, request.content(), userId);
    }
}
