package com.back.comment.controller;

import com.back.comment.dto.CommentCreateRequest;
import com.back.comment.dto.CommentResponse;
import com.back.comment.entity.Comment;
import com.back.comment.service.CommentService;
import com.back.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/tools/{moduleId}/comments")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;
    private final UserRepository userRepository;

    @GetMapping
    public List<CommentResponse> getComments(@PathVariable String moduleId) {
        List<Comment> comments = commentService.getComments(moduleId);
        Map<Long, String> nicknames = nicknamesOf(comments);
        return comments.stream()
                .map(comment -> CommentResponse.from(comment, nicknames.get(comment.getUserId())))
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CommentResponse addComment(@PathVariable String moduleId,
                                     @RequestBody CommentCreateRequest request,
                                     @AuthenticationPrincipal Long userId) {
        Comment comment = commentService.addComment(moduleId, request.content(), userId);
        String nickname = userId == null ? null
                : userRepository.findById(userId).map(user -> user.getNickname()).orElse(null);
        return CommentResponse.from(comment, nickname);
    }

    private Map<Long, String> nicknamesOf(List<Comment> comments) {
        List<Long> userIds = comments.stream().map(Comment::getUserId).filter(id -> id != null).distinct().toList();
        return userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(user -> user.getId(), user -> user.getNickname()));
    }
}
