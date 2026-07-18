package com.back.comment.dto;

import com.back.comment.entity.Comment;

import java.time.LocalDateTime;

public record CommentResponse(Long id, String content, LocalDateTime createdAt, String nickname) {

    public static CommentResponse from(Comment comment, String nickname) {
        return new CommentResponse(comment.getId(), comment.getContent(), comment.getCreatedAt(), nickname);
    }
}
