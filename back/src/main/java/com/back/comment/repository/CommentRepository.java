package com.back.comment.repository;

import com.back.comment.entity.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    List<Comment> findAllByModuleIdOrderByCreatedAtDesc(String moduleId);

    List<Comment> findAllByOrderByCreatedAtDesc();

    /** 회원 탈퇴(055-②) — 댓글은 삭제하지 않고 작성자 연결만 끊는다(내용 유지, "익명" 표시로 전환). */
    @Modifying
    @Query("UPDATE Comment c SET c.userId = null WHERE c.userId = :userId")
    void anonymizeByUserId(@Param("userId") Long userId);
}
