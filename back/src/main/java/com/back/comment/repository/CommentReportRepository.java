package com.back.comment.repository;

import com.back.comment.entity.CommentReport;
import com.back.comment.entity.CommentReportReason;
import com.back.comment.entity.CommentReportStatus;
import com.back.comment.dto.ReportedUserReason;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CommentReportRepository extends JpaRepository<CommentReport, Long> {

    boolean existsByReporterIdAndCommentId(Long reporterId, Long commentId);

    // status/reason 둘 다 선택적 필터 — null이면 해당 조건을 건너뛴다(UserRepository.search와 동일한 패턴).
    @Query("SELECT cr FROM CommentReport cr WHERE (:status IS NULL OR cr.status = :status) " +
            "AND (:reason IS NULL OR cr.reason = :reason)")
    Page<CommentReport> search(@Param("status") CommentReportStatus status,
                                @Param("reason") CommentReportReason reason,
                                Pageable pageable);

    // 056(회원 정지) 판단 근거는 로그인 유저(userId가 있는) 댓글에 한정된다 — 익명 댓글 신고는 집계에서 제외.
    // 두 엔티티 사이에 FK 연관관계가 없어(comment_id는 순수 컬럼) 명시적 ON 조인으로 연결한다.
    @Query("SELECT new com.back.comment.dto.ReportedUserReason(c.userId, cr.reason) " +
            "FROM CommentReport cr JOIN Comment c ON cr.commentId = c.id " +
            "WHERE c.userId IS NOT NULL")
    List<ReportedUserReason> findReasonsForReportedUsers();
}
