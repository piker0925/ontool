package com.back.comment.service;

import com.back.comment.entity.Comment;
import com.back.comment.repository.CommentRepository;
import com.back.global.exception.AppException;
import com.back.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CommentService {

    private final CommentRepository commentRepository;

    @Transactional(readOnly = true)
    public List<Comment> getComments(String moduleId) {
        return commentRepository.findAllByModuleIdOrderByCreatedAtDesc(moduleId);
    }

    @Transactional(readOnly = true)
    public List<Comment> findAll() {
        return commentRepository.findAllByOrderByCreatedAtDesc();
    }

    @Transactional
    public Comment addComment(String moduleId, String content, Long userId) {
        Comment comment = new Comment();
        comment.setModuleId(moduleId);
        comment.setContent(content);
        comment.setUserId(userId);
        return commentRepository.save(comment);
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
