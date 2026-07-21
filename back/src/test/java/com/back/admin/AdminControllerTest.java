package com.back.admin;

import com.back.AbstractMySQLIntegrationTest;
import com.back.adminactionlog.entity.AdminActionLog;
import com.back.adminactionlog.entity.AdminActionType;
import com.back.adminactionlog.repository.AdminActionLogRepository;
import com.back.comment.entity.Comment;
import com.back.comment.repository.CommentRepository;
import com.back.global.security.jwt.JwtProvider;
import com.back.job.entity.Job;
import com.back.job.entity.JobStatus;
import com.back.job.repository.JobRepository;
import com.back.stats.entity.ToolStats;
import com.back.stats.repository.ToolStatsRepository;
import com.back.suggestion.entity.Suggestion;
import com.back.suggestion.repository.SuggestionRepository;
import com.back.user.dto.TokenPair;
import com.back.user.entity.AuthProvider;
import com.back.user.entity.User;
import com.back.user.repository.RefreshTokenRepository;
import com.back.user.repository.UserRepository;
import com.back.user.service.RefreshTokenService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("local")
@TestPropertySource(properties = {
        "storage.upload-dir=build/test-uploads",
        // 큐 조회(060) 테스트가 심는 PENDING Job을 실제 워커가 가로채 상태를 바꿔버리는 걸 막는다 —
        // 여기서는 워커 동작이 아니라 /admin/jobs 응답만 검증하면 된다.
        "scheduling.worker.delay=60000",
        "scheduling.ttl.delay=60000"
})
class AdminControllerTest extends AbstractMySQLIntegrationTest {

    @Autowired
    WebApplicationContext wac;
    @Autowired
    CommentRepository commentRepository;
    @Autowired
    ToolStatsRepository toolStatsRepository;
    @Autowired
    SuggestionRepository suggestionRepository;
    @Autowired
    JwtProvider jwtProvider;
    @Autowired
    UserRepository userRepository;
    @Autowired
    RefreshTokenRepository refreshTokenRepository;
    @Autowired
    RefreshTokenService refreshTokenService;
    @Autowired
    JobRepository jobRepository;
    @Autowired
    AdminActionLogRepository adminActionLogRepository;

    MockMvc mockMvc;

    @BeforeEach
    void setup() {
        refreshTokenRepository.deleteAll();
        userRepository.deleteAll();
        adminActionLogRepository.deleteAll();
        mockMvc = MockMvcBuilders.webAppContextSetup(wac)
                .apply(springSecurity())
                .build();
    }

    @Test
    void getStats_withoutAuth_returns401() throws Exception {
        mockMvc.perform(get("/admin/stats"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getStats_withAuth_returns200() throws Exception {
        ToolStats stats = new ToolStats("sha256");
        stats.setUseCount(3);
        stats.setLikeCount(1);
        toolStatsRepository.save(stats);

        mockMvc.perform(get("/admin/stats")
                        .with(httpBasic("admin", "1234")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.moduleId == 'sha256')].useCount").value(3))
                .andExpect(jsonPath("$[?(@.moduleId == 'sha256')].likeCount").value(1));
    }

    @Test
    void getSuggestions_withAuth_returns200() throws Exception {
        Suggestion suggestion = new Suggestion();
        suggestion.setContent("more modules please");
        suggestionRepository.save(suggestion);

        mockMvc.perform(get("/admin/suggestions")
                        .with(httpBasic("admin", "1234")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.content == 'more modules please')]").exists());
    }

    @Test
    void deleteComment_withAuth_returns204() throws Exception {
        Comment comment = new Comment();
        comment.setModuleId("test-module");
        comment.setContent("test content");
        Comment saved = commentRepository.save(comment);

        mockMvc.perform(delete("/admin/comments/" + saved.getId())
                        .with(httpBasic("admin", "1234")))
                .andExpect(status().isNoContent());
    }

    @Test
    void deleteComment_관리자_액션_로그에_COMMENT_DELETE와_대상_댓글_id로_기록된다() throws Exception {
        Comment comment = new Comment();
        comment.setModuleId("test-module");
        comment.setContent("test content");
        Comment saved = commentRepository.save(comment);

        mockMvc.perform(delete("/admin/comments/" + saved.getId())
                        .with(httpBasic("admin", "1234")))
                .andExpect(status().isNoContent());

        List<AdminActionLog> logs = adminActionLogRepository.findAll();
        assertThat(logs).hasSize(1);
        assertThat(logs.get(0).getActionType()).isEqualTo(AdminActionType.COMMENT_DELETE);
        assertThat(logs.get(0).getTargetId()).isEqualTo(saved.getId());
    }

    @Test
    void publicApi_withoutAuth_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/modules"))
                .andExpect(status().isOk());
    }

    @Test
    void getStats_일반_소셜로그인_유저의_JWT로는_거부된다() throws Exception {
        String normalUserToken = jwtProvider.issueAccessToken(1L);

        mockMvc.perform(get("/admin/stats")
                        .header("Authorization", "Bearer " + normalUserToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void getUsers_withAuth_returns200_가입일_내림차순_정렬() throws Exception {
        userRepository.save(new User(AuthProvider.GOOGLE, "g-1", "a@test.com", "먼저가입"));
        Thread.sleep(5);
        userRepository.save(new User(AuthProvider.KAKAO, "k-1", null, "나중가입"));

        mockMvc.perform(get("/admin/users")
                        .with(httpBasic("admin", "1234")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].nickname").value("나중가입"))
                .andExpect(jsonPath("$.content[1].nickname").value("먼저가입"))
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.totalPages").value(1))
                .andExpect(jsonPath("$.page").value(0));
    }

    @Test
    void getUsers_닉네임_검색은_부분일치하는_유저만_반환한다() throws Exception {
        userRepository.save(new User(AuthProvider.GOOGLE, "search-1", null, "판다왕자"));
        userRepository.save(new User(AuthProvider.KAKAO, "search-2", null, "여우요정"));

        mockMvc.perform(get("/admin/users").param("search", "판다")
                        .with(httpBasic("admin", "1234")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].nickname").value("판다왕자"));
    }

    @Test
    void getUsers_provider_검색은_해당_provider_유저만_반환한다() throws Exception {
        userRepository.save(new User(AuthProvider.GOOGLE, "search-3", null, "구글유저"));
        userRepository.save(new User(AuthProvider.KAKAO, "search-4", null, "카카오유저"));

        mockMvc.perform(get("/admin/users").param("search", "kakao")
                        .with(httpBasic("admin", "1234")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].nickname").value("카카오유저"));
    }

    @Test
    void getUsers_size로_페이지네이션이_실제로_적용된다() throws Exception {
        userRepository.save(new User(AuthProvider.GOOGLE, "page-1", null, "페이지유저1"));
        Thread.sleep(5);
        userRepository.save(new User(AuthProvider.GOOGLE, "page-2", null, "페이지유저2"));
        Thread.sleep(5);
        userRepository.save(new User(AuthProvider.GOOGLE, "page-3", null, "페이지유저3"));

        mockMvc.perform(get("/admin/users").param("size", "2").param("page", "0")
                        .with(httpBasic("admin", "1234")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(2))
                .andExpect(jsonPath("$.totalElements").value(3))
                .andExpect(jsonPath("$.totalPages").value(2))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.content[0].nickname").value("페이지유저3"));

        mockMvc.perform(get("/admin/users").param("size", "2").param("page", "1")
                        .with(httpBasic("admin", "1234")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.content[0].nickname").value("페이지유저1"));
    }

    @Test
    void forceLogout_대상_유저의_refresh_토큰이_무효화된다() throws Exception {
        User target = userRepository.save(new User(AuthProvider.GOOGLE, "force-logout-target", null, "강퇴대상"));
        TokenPair issued = refreshTokenService.issue(target.getId());

        mockMvc.perform(post("/admin/users/" + target.getId() + "/force-logout")
                        .with(httpBasic("admin", "1234")))
                .andExpect(status().isNoContent());

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\": \"" + issued.refreshToken() + "\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_REFRESH_TOKEN"));
    }

    @Test
    void forceLogout_다른_유저의_토큰에는_영향_없다() throws Exception {
        User target = userRepository.save(new User(AuthProvider.GOOGLE, "force-logout-target", null, "강퇴대상"));
        User bystander = userRepository.save(new User(AuthProvider.KAKAO, "force-logout-bystander", null, "무관한유저"));
        refreshTokenService.issue(target.getId());
        TokenPair bystanderTokens = refreshTokenService.issue(bystander.getId());

        mockMvc.perform(post("/admin/users/" + target.getId() + "/force-logout")
                        .with(httpBasic("admin", "1234")))
                .andExpect(status().isNoContent());

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\": \"" + bystanderTokens.refreshToken() + "\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void forceLogout_존재하지_않는_유저면_404() throws Exception {
        mockMvc.perform(post("/admin/users/999999/force-logout")
                        .with(httpBasic("admin", "1234")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("USER_NOT_FOUND"));
    }

    @Test
    void forceLogout_관리자_액션_로그에_FORCE_LOGOUT과_대상_유저_id로_기록된다() throws Exception {
        User target = userRepository.save(new User(AuthProvider.GOOGLE, "force-logout-log-target", null, "강퇴대상2"));
        refreshTokenService.issue(target.getId());

        mockMvc.perform(post("/admin/users/" + target.getId() + "/force-logout")
                        .with(httpBasic("admin", "1234")))
                .andExpect(status().isNoContent());

        List<AdminActionLog> logs = adminActionLogRepository.findAll();
        assertThat(logs).hasSize(1);
        assertThat(logs.get(0).getActionType()).isEqualTo(AdminActionType.FORCE_LOGOUT);
        assertThat(logs.get(0).getTargetId()).isEqualTo(target.getId());
    }

    @Test
    void forceLogout_존재하지_않는_유저면_액션_로그도_남기지_않는다() throws Exception {
        mockMvc.perform(post("/admin/users/999999/force-logout")
                        .with(httpBasic("admin", "1234")))
                .andExpect(status().isNotFound());

        assertThat(adminActionLogRepository.findAll()).isEmpty();
    }

    @Test
    void forceLogout과_deleteComment를_모두_수행하면_각각_다른_actionType으로_구분되어_기록된다() throws Exception {
        User target = userRepository.save(new User(AuthProvider.GOOGLE, "mixed-action-target", null, "혼합대상"));
        Comment comment = new Comment();
        comment.setModuleId("test-module");
        comment.setContent("test content");
        Comment savedComment = commentRepository.save(comment);

        mockMvc.perform(post("/admin/users/" + target.getId() + "/force-logout")
                        .with(httpBasic("admin", "1234")))
                .andExpect(status().isNoContent());
        mockMvc.perform(delete("/admin/comments/" + savedComment.getId())
                        .with(httpBasic("admin", "1234")))
                .andExpect(status().isNoContent());

        List<AdminActionLog> logs = adminActionLogRepository.findAll();
        assertThat(logs).hasSize(2);
        assertThat(logs).anySatisfy(log -> {
            assertThat(log.getActionType()).isEqualTo(AdminActionType.FORCE_LOGOUT);
            assertThat(log.getTargetId()).isEqualTo(target.getId());
        });
        assertThat(logs).anySatisfy(log -> {
            assertThat(log.getActionType()).isEqualTo(AdminActionType.COMMENT_DELETE);
            assertThat(log.getTargetId()).isEqualTo(savedComment.getId());
        });
    }

    @Test
    void getActionLogs_withoutAuth_returns401() throws Exception {
        mockMvc.perform(get("/admin/action-logs"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getActionLogs_withAuth_performedAt_내림차순으로_반환된다() throws Exception {
        java.time.LocalDateTime oldest = java.time.LocalDateTime.now().minusDays(2);
        java.time.LocalDateTime newest = java.time.LocalDateTime.now().minusDays(1);
        // 삽입 순서와 시간순이 어긋나도록 일부러 최신 것을 먼저 저장한다.
        adminActionLogRepository.save(new AdminActionLog(AdminActionType.COMMENT_DELETE, 100L, newest));
        adminActionLogRepository.save(new AdminActionLog(AdminActionType.FORCE_LOGOUT, 200L, oldest));

        mockMvc.perform(get("/admin/action-logs")
                        .with(httpBasic("admin", "1234")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].targetId").value(100))
                .andExpect(jsonPath("$.content[0].actionType").value("COMMENT_DELETE"))
                .andExpect(jsonPath("$.content[1].targetId").value(200))
                .andExpect(jsonPath("$.content[1].actionType").value("FORCE_LOGOUT"))
                .andExpect(jsonPath("$.totalElements").value(2));
    }

    @Test
    void getActionLogs_size로_페이지네이션이_적용된다() throws Exception {
        java.time.LocalDateTime t1 = java.time.LocalDateTime.now().minusDays(3);
        java.time.LocalDateTime t2 = java.time.LocalDateTime.now().minusDays(2);
        java.time.LocalDateTime t3 = java.time.LocalDateTime.now().minusDays(1);
        adminActionLogRepository.save(new AdminActionLog(AdminActionType.FORCE_LOGOUT, 1L, t1));
        adminActionLogRepository.save(new AdminActionLog(AdminActionType.FORCE_LOGOUT, 2L, t2));
        adminActionLogRepository.save(new AdminActionLog(AdminActionType.FORCE_LOGOUT, 3L, t3));

        mockMvc.perform(get("/admin/action-logs").param("size", "2").param("page", "0")
                        .with(httpBasic("admin", "1234")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(2))
                .andExpect(jsonPath("$.totalElements").value(3))
                .andExpect(jsonPath("$.totalPages").value(2))
                .andExpect(jsonPath("$.content[0].targetId").value(3))
                .andExpect(jsonPath("$.content[1].targetId").value(2));

        mockMvc.perform(get("/admin/action-logs").param("size", "2").param("page", "1")
                        .with(httpBasic("admin", "1234")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].targetId").value(1));
    }

    @Test
    void getStats_failCount이_실제_FAILED_Job_수와_일치한다() throws Exception {
        ToolStats stats = new ToolStats("fail-count-test");
        toolStatsRepository.save(stats);
        saveJob("fail-count-test", JobStatus.FAILED);
        saveJob("fail-count-test", JobStatus.FAILED);
        saveJob("fail-count-test", JobStatus.DONE);

        ToolStats onlySuccess = new ToolStats("only-success-test");
        toolStatsRepository.save(onlySuccess);
        saveJob("only-success-test", JobStatus.DONE);

        mockMvc.perform(get("/admin/stats")
                        .with(httpBasic("admin", "1234")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.moduleId == 'fail-count-test')].failCount").value(2))
                .andExpect(jsonPath("$[?(@.moduleId == 'only-success-test')].failCount").value(0));
    }

    @Test
    void getJobs_PENDING_RUNNING만_반환하고_DONE_FAILED는_안_섞인다() throws Exception {
        saveJob("queue-view-test", JobStatus.PENDING);
        saveJob("queue-view-test", JobStatus.RUNNING);
        saveJob("queue-view-test-excluded", JobStatus.DONE);
        saveJob("queue-view-test-excluded", JobStatus.FAILED);

        mockMvc.perform(get("/admin/jobs")
                        .with(httpBasic("admin", "1234")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.moduleId == 'queue-view-test')]", org.hamcrest.Matchers.hasSize(2)))
                .andExpect(jsonPath("$[?(@.moduleId == 'queue-view-test-excluded')]", org.hamcrest.Matchers.hasSize(0)));
    }

    @Test
    void getJobs_status_파라미터를_명시하면_해당_상태만_반환한다() throws Exception {
        saveJob("status-param-test", JobStatus.DONE);
        saveJob("status-param-test", JobStatus.PENDING);

        mockMvc.perform(get("/admin/jobs").param("status", "DONE")
                        .with(httpBasic("admin", "1234")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.moduleId == 'status-param-test' && @.status == 'DONE')]", org.hamcrest.Matchers.hasSize(1)))
                .andExpect(jsonPath("$[?(@.moduleId == 'status-param-test' && @.status == 'PENDING')]", org.hamcrest.Matchers.hasSize(0)));
    }

    private void saveJob(String moduleId, JobStatus status) {
        Job job = new Job();
        job.setModuleId(moduleId);
        job.setStatus(status);
        job.setExpiresAt(java.time.LocalDateTime.now().plusHours(1));
        jobRepository.save(job);
    }
}
