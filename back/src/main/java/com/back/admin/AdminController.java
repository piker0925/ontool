package com.back.admin;

import com.back.adminactionlog.entity.AdminActionType;
import com.back.adminactionlog.service.AdminActionLogService;
import com.back.comment.service.CommentService;
import com.back.global.response.PageResponse;
import com.back.job.entity.JobStatus;
import com.back.job.service.JobService;
import com.back.stats.service.ToolStatsService;
import com.back.suggestion.entity.Suggestion;
import com.back.suggestion.service.SuggestionService;
import com.back.user.entity.User;
import com.back.user.service.RefreshTokenService;
import com.back.user.service.UserService;
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
public class AdminController {

    private static final Set<JobStatus> DEFAULT_QUEUE_STATUSES = Set.of(JobStatus.PENDING, JobStatus.RUNNING);

    private final ToolStatsService toolStatsService;
    private final SuggestionService suggestionService;
    private final CommentService commentService;
    private final UserService userService;
    private final RefreshTokenService refreshTokenService;
    private final JobService jobService;
    private final AdminActionLogService adminActionLogService;

    @GetMapping("/stats")
    public ResponseEntity<List<AdminToolStatsResponse>> getStats() {
        List<AdminToolStatsResponse> stats = toolStatsService.findAll().stream()
                .map(s -> AdminToolStatsResponse.from(s, toolStatsService.getFailCount(s.getModuleId())))
                .toList();
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/suggestions")
    public ResponseEntity<List<Suggestion>> getSuggestions() {
        return ResponseEntity.ok(suggestionService.findAll());
    }

    @GetMapping("/comments")
    public ResponseEntity<List<AdminCommentResponse>> getComments() {
        List<AdminCommentResponse> comments = commentService.findAll().stream()
                .map(AdminCommentResponse::from)
                .toList();
        return ResponseEntity.ok(comments);
    }

    @DeleteMapping("/comments/{id}")
    public ResponseEntity<Void> deleteComment(@PathVariable Long id) {
        commentService.deleteById(id);
        adminActionLogService.record(AdminActionType.COMMENT_DELETE, id);
        return ResponseEntity.noContent().build();
    }

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

    @PostMapping("/users/{id}/force-logout")
    public ResponseEntity<Void> forceLogout(@PathVariable Long id) {
        userService.getExistingById(id);
        refreshTokenService.forceLogout(id);
        adminActionLogService.record(AdminActionType.FORCE_LOGOUT, id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/jobs")
    public ResponseEntity<List<AdminJobResponse>> getJobs(@RequestParam(required = false) Set<JobStatus> status) {
        List<AdminJobResponse> jobs = jobService.findByStatusIn(status == null ? DEFAULT_QUEUE_STATUSES : status).stream()
                .map(AdminJobResponse::from)
                .toList();
        return ResponseEntity.ok(jobs);
    }

    @GetMapping("/action-logs")
    public ResponseEntity<PageResponse<AdminActionLogResponse>> getActionLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<AdminActionLogResponse> logs = adminActionLogService.findRecent(page, size).map(AdminActionLogResponse::from);
        return ResponseEntity.ok(PageResponse.of(logs));
    }
}
