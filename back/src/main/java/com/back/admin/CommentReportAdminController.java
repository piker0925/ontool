package com.back.admin;

import com.back.comment.dto.CommentReportResponse;
import com.back.comment.dto.CommentReportStatusUpdateRequest;
import com.back.comment.dto.CommentReportUserAggregateResponse;
import com.back.comment.entity.CommentReportReason;
import com.back.comment.entity.CommentReportStatus;
import com.back.comment.service.CommentReportService;
import com.back.global.response.PageResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 댓글 신고 관리자 뷰(099) — AdminController가 너무 커지지 않도록 별도 컨트롤러로 분리한다.
 * /admin/** 이라 SecurityConfig의 hasRole("ADMIN")이 그대로 적용된다(별도 보안 설정 불필요).
 */
@RestController
@RequestMapping("/admin/comment-reports")
@RequiredArgsConstructor
@Tag(name = "관리자 - 댓글 신고 (Admin Comment Report)", description = "댓글 신고 검토·처리 API (관리자 전용)")
public class CommentReportAdminController {

    private final CommentReportService commentReportService;

    /** 개별 신고 목록 — 상태/사유로 필터링, 상세 확인·상태 전환용. */
    @Operation(summary = "댓글 신고 목록 조회", description = "상태·사유로 필터링해 개별 댓글 신고 목록을 페이지네이션 조회합니다.")
    @GetMapping
    public ResponseEntity<PageResponse<CommentReportResponse>> getReports(
            @Parameter(description = "필터링할 신고 상태") @RequestParam(required = false) CommentReportStatus status,
            @Parameter(description = "필터링할 신고 사유") @RequestParam(required = false) CommentReportReason reason,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<CommentReportResponse> reports = commentReportService.findReports(status, reason, page, size);
        return ResponseEntity.ok(PageResponse.of(reports));
    }

    /** 유저별 신고 누적 집계 — 056(회원 정지) 판단용. */
    @Operation(summary = "유저별 신고 누적 집계 조회", description = "회원별로 누적된 댓글 신고 건수를 집계해 조회합니다. 정지 여부 판단 자료로 사용합니다.")
    @GetMapping("/users")
    public ResponseEntity<List<CommentReportUserAggregateResponse>> getUserAggregates() {
        return ResponseEntity.ok(commentReportService.findUserAggregates());
    }

    /** RESOLVED/DISMISSED 전환. 댓글·유저 상태에 부수효과 없음 — "검토 여부" 표시일 뿐이다. */
    @Operation(summary = "댓글 신고 상태 전환", description = "댓글 신고를 RESOLVED(처리 완료) 또는 DISMISSED(반려)로 전환합니다. 댓글이나 신고자의 상태에는 부수효과가 없습니다.")
    @PatchMapping("/{id}/status")
    public ResponseEntity<Void> updateStatus(@Parameter(description = "대상 신고 ID") @PathVariable Long id,
                                              @Valid @RequestBody CommentReportStatusUpdateRequest request) {
        commentReportService.updateStatus(id, request.status());
        return ResponseEntity.noContent().build();
    }
}
