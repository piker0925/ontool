package com.back.comment.service;

import com.back.comment.entity.Comment;
import com.back.comment.repository.CommentRepository;
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

    @Transactional
    public Comment addComment(String moduleId, String content) {
        Comment comment = new Comment();
        comment.setModuleId(moduleId);
        comment.setContent(content);
        return commentRepository.save(comment);
    }

    @Transactional
    public void deleteById(Long id) {
        commentRepository.deleteById(id);
    }
}
