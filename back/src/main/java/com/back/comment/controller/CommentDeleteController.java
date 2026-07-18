package com.back.comment.controller;

import com.back.comment.service.CommentService;
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
public class CommentDeleteController {

    private final CommentService commentService;

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteOwn(@PathVariable Long id, @AuthenticationPrincipal Long userId) {
        commentService.deleteOwnComment(id, userId);
    }
}
