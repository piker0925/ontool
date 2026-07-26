package com.back.admin;

import com.back.adminactionlog.entity.AdminActionType;
import com.back.adminactionlog.service.AdminActionLogService;
import com.back.comment.service.CommentService;
import com.back.global.response.PageResponse;
import com.back.job.entity.JobStatus;
import com.back.job.service.AdmissionControl;
import com.back.job.service.JobService;
import com.back.stats.entity.ToolStats;
import com.back.stats.service.ToolStatsService;
import com.back.suggestion.entity.Suggestion;
import com.back.suggestion.service.SuggestionService;
import com.back.user.entity.User;
import com.back.user.service.RefreshTokenService;
import com.back.user.service.SocialUnlinkService;
import com.back.user.service.UserService;
import com.back.user.service.UserWithdrawalService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
@Tag(name = "관리자 (Admin)", description = "운영자 전용 통계·건의사항·댓글·회원·작업 큐·감사로그 관리 API (HTTP Basic 인증 필요)")
public class AdminController {

    private static final Set<JobStatus> DEFAULT_QUEUE_STATUSES = Set.of(JobStatus.PENDING, JobStatus.RUNNING);

    private final ToolStatsService toolStatsService;
    private final SuggestionService suggestionService;
    private final CommentService commentService;
    private final UserService userService;
    private final RefreshTokenService refreshTokenService;
    private final JobService jobService;
    private final AdminActionLogService adminActionLogService;
    private final UserWithdrawalService userWithdrawalService;
    private final SocialUnlinkService socialUnlinkService;
    private final AdmissionControl admissionControl;

    @Operation(summary = "모듈별 사용 통계 조회", description = "전체 도구 모듈의 사용 횟수·좋아요 수·실패 건수를 조회합니다.")
    @GetMapping("/stats")
    public ResponseEntity<List<AdminToolStatsResponse>> getStats() {
        List<ToolStats> allStats = toolStatsService.findAll();
        List<String> moduleIds = allStats.stream().map(ToolStats::getModuleId).toList();
        // 모듈마다 실패 건수를 따로 조회하면 N+1이 되므로, 현재 목록의 모듈 id들만 모아 한 번에 배치 조회한다.
        Map<String, Long> failCounts = toolStatsService.getFailCounts(moduleIds);
        List<AdminToolStatsResponse> stats = allStats.stream()
                .map(s -> AdminToolStatsResponse.from(s, failCounts.getOrDefault(s.getModuleId(), 0L)))
                .toList();
        return ResponseEntity.ok(stats);
    }

    @Operation(summary = "건의사항 전체 조회", description = "사용자가 제출한 건의사항 목록을 전체 조회합니다.")
    @GetMapping("/suggestions")
    public ResponseEntity<List<Suggestion>> getSuggestions() {
        return ResponseEntity.ok(suggestionService.findAll());
    }

    // 시스템 전체 댓글은 무제한으로 쌓일 수 있어 findAll()을 그대로 노출하면 응답이 무한정
    // 커진다 — /admin/users, /admin/action-logs와 같은 page/size 페이지네이션 패턴을 그대로 적용한다.
    @Operation(summary = "댓글 전체 조회", description = "전체 도구의 댓글 목록을 조회합니다(신고 처리와 무관한 일반 모니터링용).")
    @GetMapping("/comments")
    public ResponseEntity<PageResponse<AdminCommentResponse>> getComments(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<AdminCommentResponse> comments = commentService.findRecent(page, size).map(AdminCommentResponse::from);
        return ResponseEntity.ok(PageResponse.of(comments));
    }

    @Operation(summary = "댓글 강제 삭제", description = "지정한 ID의 댓글을 관리자 권한으로 삭제하고 감사 로그를 남깁니다.")
    @DeleteMapping("/comments/{id}")
    public ResponseEntity<Void> deleteComment(@Parameter(description = "삭제할 댓글 ID") @PathVariable Long id) {
        commentService.deleteById(id);
        adminActionLogService.record(AdminActionType.COMMENT_DELETE, id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "회원 목록 검색·조회", description = "닉네임/이메일 검색어와 페이지네이션으로 회원 목록을 조회합니다. 회원별 refresh token 탈취 이벤트 발생 횟수를 함께 내려줍니다.")
    @GetMapping("/users")
    public ResponseEntity<PageResponse<AdminUserResponse>> getUsers(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<User> users = userService.search(search, page, size);
        List<Long> userIds = users.getContent().stream().map(User::getId).toList();
        // 유저마다 발동 횟수를 따로 조회하면 N+1이 되므로, 현재 페이지의 id들만 모아 한 번에 배치 조회한다.
        Map<Long, Long> theftEventCounts = refreshTokenService.countTheftEventsByUserIds(userIds);
        Page<AdminUserResponse> responses = users.map(user ->
                AdminUserResponse.from(user, theftEventCounts.getOrDefault(user.getId(), 0L)));
        return ResponseEntity.ok(PageResponse.of(responses));
    }

    @Operation(summary = "회원 강제 로그아웃", description = "지정한 회원의 모든 refresh token을 무효화해 강제 로그아웃시키고 감사 로그를 남깁니다.")
    @PostMapping("/users/{id}/force-logout")
    public ResponseEntity<Void> forceLogout(@Parameter(description = "대상 회원 ID") @PathVariable Long id) {
        userService.getExistingById(id);
        refreshTokenService.forceLogout(id);
        adminActionLogService.record(AdminActionType.FORCE_LOGOUT, id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "회원 정지", description = "지정한 회원을 정지 상태로 전환하고 감사 로그를 남깁니다.")
    @PostMapping("/users/{id}/suspend")
    public ResponseEntity<Void> suspendUser(@Parameter(description = "대상 회원 ID") @PathVariable Long id) {
        userService.suspend(id);
        adminActionLogService.record(AdminActionType.MEMBER_SUSPEND, id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "회원 정지 해제", description = "정지된 회원을 다시 활성 상태로 전환하고 감사 로그를 남깁니다.")
    @PostMapping("/users/{id}/unsuspend")
    public ResponseEntity<Void> unsuspendUser(@Parameter(description = "대상 회원 ID") @PathVariable Long id) {
        userService.unsuspend(id);
        adminActionLogService.record(AdminActionType.MEMBER_UNSUSPEND, id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "회원 강제 탈퇴", description = "지정한 회원을 강제로 탈퇴 처리하고, 연동된 소셜 계정 연결도 최선 노력(best-effort)으로 해제한 뒤 감사 로그를 남깁니다.")
    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> forceDeleteUser(@Parameter(description = "대상 회원 ID") @PathVariable Long id) {
        User user = userWithdrawalService.withdraw(id);
        socialUnlinkService.bestEffortUnlink(user);
        adminActionLogService.record(AdminActionType.ACCOUNT_FORCE_DELETE, id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "작업 큐 조회", description = "지정한 상태의 Job 목록을 조회합니다. 상태를 지정하지 않으면 PENDING/RUNNING(대기·처리 중)인 Job만 조회합니다.")
    @GetMapping("/jobs")
    public ResponseEntity<List<AdminJobResponse>> getJobs(
            @Parameter(description = "필터링할 Job 상태 집합. 생략 시 PENDING·RUNNING") @RequestParam(required = false) Set<JobStatus> status) {
        List<AdminJobResponse> jobs = jobService.findByStatusIn(status == null ? DEFAULT_QUEUE_STATUSES : status).stream()
                .map(AdminJobResponse::from)
                .toList();
        return ResponseEntity.ok(jobs);
    }

    @Operation(summary = "관리자 감사 로그 조회", description = "관리자가 수행한 강제 로그아웃·정지·삭제 등의 작업 이력을 최신순으로 페이지네이션하여 조회합니다.")
    @GetMapping("/action-logs")
    public ResponseEntity<PageResponse<AdminActionLogResponse>> getActionLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<AdminActionLogResponse> logs = adminActionLogService.findRecent(page, size).map(AdminActionLogResponse::from);
        return ResponseEntity.ok(PageResponse.of(logs));
    }

    /**
     * 어드민 대시보드 시각화(118) — 레인 분포·가입경로 분포·큐 적체 게이지·일별 추이를 한 번에 담아 돌려준다.
     * 기존 /admin/stats(모듈 통계), /admin/jobs(큐 목록), /admin/action-logs(감사로그)로 이미 커버되는
     * 데이터는 다시 담지 않는다 — 그 셋은 프론트에서 각자 조회한다.
     */
    @Operation(summary = "관리자 대시보드 통계 조회", description = "레인별 작업 분포, 가입 경로 분포, 큐 적체 현황, 일별 작업·가입 추이를 한 번에 조회합니다.")
    @GetMapping("/stats/dashboard")
    public ResponseEntity<AdminDashboardStatsResponse> getDashboardStats(
            @Parameter(description = "일별 추이를 조회할 기간(일)") @RequestParam(defaultValue = "14") int days) {
        AdminDashboardStatsResponse response = AdminDashboardStatsResponse.of(
                jobService.getLaneDistribution(),
                userService.getProviderDistribution(),
                admissionControl.queueDepthSnapshot(),
                jobService.getDailyJobCounts(days),
                userService.getDailySignups(days)
        );
        return ResponseEntity.ok(response);
    }
}
