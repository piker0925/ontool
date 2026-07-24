package com.back.comment.service;

import com.back.comment.dto.CommentReportResponse;
import com.back.comment.dto.CommentReportUserAggregateResponse;
import com.back.comment.dto.ReportedUserReason;
import com.back.comment.entity.Comment;
import com.back.comment.entity.CommentReport;
import com.back.comment.entity.CommentReportReason;
import com.back.comment.entity.CommentReportStatus;
import com.back.comment.repository.CommentReportRepository;
import com.back.comment.repository.CommentRepository;
import com.back.global.exception.AppException;
import com.back.global.exception.ErrorCode;
import com.back.user.entity.User;
import com.back.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/** 댓글 신고(099). 056(회원 정지)의 판정 근거로 쓰일 신고 누적치를 제공하는 것이 1차 목적. */
@Service
@RequiredArgsConstructor
public class CommentReportService {

    private final CommentReportRepository commentReportRepository;
    private final CommentRepository commentRepository;
    private final UserRepository userRepository;

    /** 로그인 유저의 댓글 신고. 익명 댓글(userId null)도 신고 대상에 포함된다 — 자격 제한은 "신고자"에만 적용된다. */
    @Transactional
    public CommentReport report(Long commentId, Long reporterId, CommentReportReason reason, String detail) {
        commentRepository.findById(commentId)
                .orElseThrow(() -> new AppException(ErrorCode.COMMENT_NOT_FOUND));

        if (reason == CommentReportReason.OTHER && (detail == null || detail.isBlank())) {
            throw new AppException(ErrorCode.COMMENT_REPORT_DETAIL_REQUIRED);
        }

        // 빠른 경로(가독성 좋은 409) + DB 유니크 제약을 최후 방어선으로 둔다(동시 요청 레이스 대비).
        if (commentReportRepository.existsByReporterIdAndCommentId(reporterId, commentId)) {
            throw new AppException(ErrorCode.COMMENT_REPORT_DUPLICATE);
        }

        try {
            return commentReportRepository.save(new CommentReport(commentId, reporterId, reason, detail));
        } catch (DataIntegrityViolationException e) {
            throw new AppException(ErrorCode.COMMENT_REPORT_DUPLICATE);
        }
    }

    /** 관리자용 개별 신고 목록 — 상태/사유 필터, 최신순. 댓글 내용·신고자 닉네임까지 조인해서 응답한다. */
    @Transactional(readOnly = true)
    public Page<CommentReportResponse> findReports(CommentReportStatus status, CommentReportReason reason, int page, int size) {
        Pageable pageable = PageRequest.of(page, size,
                Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id")));
        Page<CommentReport> reports = commentReportRepository.search(status, reason, pageable);

        Map<Long, Comment> comments = commentRepository.findAllById(
                reports.getContent().stream().map(CommentReport::getCommentId).distinct().toList()
        ).stream().collect(Collectors.toMap(Comment::getId, c -> c));

        Map<Long, String> reporterNicknames = userRepository.findAllById(
                reports.getContent().stream().map(CommentReport::getReporterId).distinct().toList()
        ).stream().collect(Collectors.toMap(User::getId, User::getNickname));

        return reports.map(r -> {
            Comment comment = comments.get(r.getCommentId());
            return CommentReportResponse.of(r, comment == null ? null : comment.getContent(),
                    reporterNicknames.get(r.getReporterId()));
        });
    }

    /** 관리자용 상태 전환. 댓글·유저에는 아무 부수효과가 없다 — "검토 여부" 표시일 뿐이다. */
    @Transactional
    public CommentReport updateStatus(Long id, CommentReportStatus status) {
        CommentReport report = commentReportRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.COMMENT_REPORT_NOT_FOUND));
        report.setStatus(status);
        return report;
    }

    /**
     * 유저별 신고 누적 집계(056 정지 판단용). 로그인 유저 댓글에 한정 — 익명 댓글(userId null)에 대한
     * 신고는 애초에 findReasonsForReportedUsers()에서 걸러진다.
     */
    @Transactional(readOnly = true)
    public List<CommentReportUserAggregateResponse> findUserAggregates() {
        List<ReportedUserReason> rows = commentReportRepository.findReasonsForReportedUsers();

        Map<Long, Map<CommentReportReason, Long>> grouped = rows.stream()
                .collect(Collectors.groupingBy(ReportedUserReason::userId,
                        Collectors.groupingBy(ReportedUserReason::reason, Collectors.counting())));

        Map<Long, String> nicknames = userRepository.findAllById(grouped.keySet()).stream()
                .collect(Collectors.toMap(User::getId, User::getNickname));

        return grouped.entrySet().stream()
                .map(e -> new CommentReportUserAggregateResponse(
                        e.getKey(),
                        nicknames.get(e.getKey()),
                        e.getValue().values().stream().mapToLong(Long::longValue).sum(),
                        e.getValue()))
                .sorted(Comparator.comparingLong(CommentReportUserAggregateResponse::totalCount).reversed())
                .toList();
    }
}
