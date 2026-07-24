package com.back.comment.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * 댓글 신고(099). 다른 테이블(comment, refresh_token 등)과 동일한 패턴으로, commentId/reporterId는
 * FK 연관관계 없이 순수 컬럼으로만 참조한다 — 모듈 간 결합을 낮춘다.
 * (reporter_id, comment_id) 유니크 제약으로 같은 유저의 동일 댓글 재신고를 DB 레벨에서 차단한다.
 */
@Entity
@Table(name = "comment_report", uniqueConstraints = @UniqueConstraint(columnNames = {"reporter_id", "comment_id"}))
@Getter
@NoArgsConstructor
public class CommentReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "comment_id", nullable = false)
    private Long commentId;

    @Column(name = "reporter_id", nullable = false)
    private Long reporterId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private CommentReportReason reason;

    // OTHER 사유일 때만 필수인 자유 텍스트(서비스 레이어에서 검증).
    @Column(columnDefinition = "text")
    private String detail;

    @Setter
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private CommentReportStatus status;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public CommentReport(Long commentId, Long reporterId, CommentReportReason reason, String detail) {
        this.commentId = commentId;
        this.reporterId = reporterId;
        this.reason = reason;
        this.detail = detail;
        this.status = CommentReportStatus.PENDING;
    }

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
