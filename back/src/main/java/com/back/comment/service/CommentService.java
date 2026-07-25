package com.back.comment.service;

import com.back.comment.dto.CommentResponse;
import com.back.comment.entity.Comment;
import com.back.comment.repository.CommentRepository;
import com.back.global.exception.AppException;
import com.back.global.exception.ErrorCode;
import com.back.user.entity.User;
import com.back.user.entity.UserStatus;
import com.back.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CommentService {

    private final CommentRepository commentRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<Comment> getComments(String moduleId) {
        return commentRepository.findAllByModuleIdOrderByCreatedAtDesc(moduleId);
    }

    /** 닉네임까지 붙인 댓글 목록(051) — 현재 닉네임을 조인한다(작성 시점 스냅샷 아님). */
    @Transactional(readOnly = true)
    public List<CommentResponse> getCommentResponses(String moduleId) {
        List<Comment> comments = getComments(moduleId);
        Map<Long, String> nicknames = nicknamesOf(comments);
        return comments.stream()
                .map(comment -> CommentResponse.from(comment, nicknames.get(comment.getUserId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<Comment> findAll() {
        return commentRepository.findAllByOrderByCreatedAtDesc();
    }

    @Transactional
    public Comment addComment(String moduleId, String content, Long userId) {
        requireActiveUser(userId);
        return saveComment(moduleId, content, userId);
    }

    /** 닉네임까지 붙여서 응답하는 댓글 작성(051). */
    @Transactional
    public CommentResponse addCommentAndRespond(String moduleId, String content, Long userId) {
        User user = requireActiveUser(userId);
        Comment comment = saveComment(moduleId, content, userId);
        return CommentResponse.from(comment, user == null ? null : user.getNickname());
    }

    private Comment saveComment(String moduleId, String content, Long userId) {
        Comment comment = new Comment();
        comment.setModuleId(moduleId);
        comment.setContent(content);
        comment.setUserId(userId);
        return commentRepository.save(comment);
    }

    /**
     * 정지(056)된 회원은 댓글 작성만 막는다 — 익명(userId=null)은 대상 밖, 좋아요 등 다른 행위도 대상 밖.
     * 조회한 User를 반환해 호출부(닉네임 등)가 재조회 없이 재사용할 수 있게 한다.
     */
    private User requireActiveUser(Long userId) {
        if (userId == null) return null;
        User user = userRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        if (user.getStatus() == UserStatus.SUSPENDED) {
            throw new AppException(ErrorCode.USER_SUSPENDED);
        }
        return user;
    }

    private Map<Long, String> nicknamesOf(List<Comment> comments) {
        List<Long> userIds = comments.stream().map(Comment::getUserId).filter(id -> id != null).distinct().toList();
        return userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, User::getNickname));
    }

    @Transactional
    public void deleteById(Long id) {
        commentRepository.deleteById(id);
    }

    /** 회원 본인 댓글 삭제(051) — 익명 댓글, 타인 댓글은 거부. */
    @Transactional
    public void deleteOwnComment(Long id, Long userId) {
        Comment comment = commentRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.COMMENT_NOT_FOUND));
        if (comment.getUserId() == null || !comment.getUserId().equals(userId)) {
            throw new AppException(ErrorCode.COMMENT_DELETE_FORBIDDEN);
        }
        commentRepository.delete(comment);
    }
}
