package com.back.comment.controller;

import com.back.comment.service.CommentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** 회원 본인 댓글 삭제(051) — /api/v1/tools/{moduleId}/comments와 별도 경로라 컨트롤러를 분리한다. */
@RestController
@RequestMapping("/api/v1/comments")
@RequiredArgsConstructor
@Tag(name = "댓글 (Comment)", description = "도구별 댓글 조회·작성·삭제·신고 API")
public class CommentDeleteController {

    private final CommentService commentService;

    @Operation(summary = "내 댓글 삭제", description = "로그인한 회원이 본인이 작성한 댓글을 삭제합니다. 본인 댓글이 아니면 거부됩니다.")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteOwn(@Parameter(description = "삭제할 댓글 ID") @PathVariable Long id, @AuthenticationPrincipal Long userId) {
        commentService.deleteOwnComment(id, userId);
    }
}
