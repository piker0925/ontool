package com.back.admin;

import com.back.AbstractMySQLIntegrationTest;
import com.back.comment.entity.Comment;
import com.back.comment.entity.CommentReport;
import com.back.comment.entity.CommentReportReason;
import com.back.comment.entity.CommentReportStatus;
import com.back.comment.repository.CommentReportRepository;
import com.back.comment.repository.CommentRepository;
import com.back.adminactionlog.repository.AdminActionLogRepository;
import com.back.user.entity.AuthProvider;
import com.back.user.entity.User;
import com.back.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("local")
@TestPropertySource(properties = {
        "storage.upload-dir=build/test-uploads",
        "scheduling.worker.delay=60000",
        "scheduling.ttl.delay=60000"
})
class CommentReportAdminControllerTest extends AbstractMySQLIntegrationTest {

    @Autowired
    WebApplicationContext wac;
    @Autowired
    UserRepository userRepository;
    @Autowired
    CommentRepository commentRepository;
    @Autowired
    CommentReportRepository commentReportRepository;
    @Autowired
    AdminActionLogRepository adminActionLogRepository;

    MockMvc mockMvc;

    @BeforeEach
    void setup() {
        commentReportRepository.deleteAll();
        commentRepository.deleteAll();
        userRepository.deleteAll();
        adminActionLogRepository.deleteAll();
        mockMvc = MockMvcBuilders.webAppContextSetup(wac).apply(springSecurity()).build();
    }

    @Test
    void getReports_withoutAuth_returns401() throws Exception {
        mockMvc.perform(get("/admin/comment-reports"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getReports_withAuth_댓글_내용과_신고자_닉네임이_함께_반환된다() throws Exception {
        User author = userRepository.save(new User(AuthProvider.GOOGLE, "author-1", null, "댓글작성자"));
        User reporter = userRepository.save(new User(AuthProvider.KAKAO, "reporter-1", null, "신고자닉네임"));
        Comment comment = saveComment("sha256", "신고당한 댓글 내용", author.getId());
        commentReportRepository.save(new CommentReport(comment.getId(), reporter.getId(), CommentReportReason.SPAM, null));

        mockMvc.perform(get("/admin/comment-reports")
                        .with(httpBasic("admin", "1234")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].commentContent").value("신고당한 댓글 내용"))
                .andExpect(jsonPath("$.content[0].reporterNickname").value("신고자닉네임"))
                .andExpect(jsonPath("$.content[0].reason").value("SPAM"))
                .andExpect(jsonPath("$.content[0].status").value("PENDING"))
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    void getReports_status_필터를_지정하면_해당_상태만_반환된다() throws Exception {
        User reporter = userRepository.save(new User(AuthProvider.GOOGLE, "reporter-2", null, "필터신고자"));
        Comment comment1 = saveComment("sha256", "대기중 신고 댓글", null);
        Comment comment2 = saveComment("sha256", "확인완료 신고 댓글", null);
        commentReportRepository.save(new CommentReport(comment1.getId(), reporter.getId(), CommentReportReason.SPAM, null));
        CommentReport resolved = commentReportRepository.save(
                new CommentReport(comment2.getId(), reporter.getId(), CommentReportReason.ABUSE, null));
        resolved.setStatus(CommentReportStatus.RESOLVED);
        commentReportRepository.save(resolved);

        mockMvc.perform(get("/admin/comment-reports").param("status", "PENDING")
                        .with(httpBasic("admin", "1234")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].commentContent").value("대기중 신고 댓글"));

        mockMvc.perform(get("/admin/comment-reports").param("status", "RESOLVED")
                        .with(httpBasic("admin", "1234")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].commentContent").value("확인완료 신고 댓글"));
    }

    @Test
    void getReports_reason_필터를_지정하면_해당_사유만_반환된다() throws Exception {
        User reporter = userRepository.save(new User(AuthProvider.GOOGLE, "reporter-3", null, "사유필터신고자"));
        Comment spamComment = saveComment("sha256", "스팸 댓글", null);
        Comment abuseComment = saveComment("sha256", "욕설 댓글", null);
        commentReportRepository.save(new CommentReport(spamComment.getId(), reporter.getId(), CommentReportReason.SPAM, null));
        commentReportRepository.save(new CommentReport(abuseComment.getId(), reporter.getId(), CommentReportReason.ABUSE, null));

        mockMvc.perform(get("/admin/comment-reports").param("reason", "SPAM")
                        .with(httpBasic("admin", "1234")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].commentContent").value("스팸 댓글"));
    }

    @Test
    void getUserAggregates_로그인_유저_댓글에_대한_신고만_집계되고_익명_댓글_신고는_제외된다() throws Exception {
        User reportedUser = userRepository.save(new User(AuthProvider.GOOGLE, "reported-1", null, "피신고유저"));
        User reporter1 = userRepository.save(new User(AuthProvider.KAKAO, "reporter-4", null, "집계신고자1"));
        User reporter2 = userRepository.save(new User(AuthProvider.GOOGLE, "reporter-5", null, "집계신고자2"));
        Comment memberComment = saveComment("sha256", "회원 댓글", reportedUser.getId());
        Comment anonymousComment = saveComment("sha256", "익명 댓글", null);

        commentReportRepository.save(new CommentReport(memberComment.getId(), reporter1.getId(), CommentReportReason.SPAM, null));
        commentReportRepository.save(new CommentReport(anonymousComment.getId(), reporter2.getId(), CommentReportReason.ABUSE, null));

        mockMvc.perform(get("/admin/comment-reports/users")
                        .with(httpBasic("admin", "1234")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].userId").value(reportedUser.getId()))
                .andExpect(jsonPath("$[0].nickname").value("피신고유저"))
                .andExpect(jsonPath("$[0].totalCount").value(1));
    }

    @Test
    void getUserAggregates_사유별_분포가_실제_신고_건수와_일치한다() throws Exception {
        User reportedUser = userRepository.save(new User(AuthProvider.GOOGLE, "reported-2", null, "분포유저"));
        User reporterA = userRepository.save(new User(AuthProvider.KAKAO, "reporter-6", null, "분포신고자A"));
        User reporterB = userRepository.save(new User(AuthProvider.GOOGLE, "reporter-7", null, "분포신고자B"));
        User reporterC = userRepository.save(new User(AuthProvider.KAKAO, "reporter-8b", null, "분포신고자C"));
        Comment commentA = saveComment("sha256", "댓글A", reportedUser.getId());
        Comment commentB = saveComment("sha256", "댓글B", reportedUser.getId());
        Comment commentC = saveComment("sha256", "댓글C", reportedUser.getId());

        // 사유별로 서로 다른 건수를 심어서 "합계만 맞고 분포는 뭉개진" 구현을 걸러낸다 — SPAM 2건, ABUSE 1건.
        commentReportRepository.save(new CommentReport(commentA.getId(), reporterA.getId(), CommentReportReason.SPAM, null));
        commentReportRepository.save(new CommentReport(commentB.getId(), reporterB.getId(), CommentReportReason.SPAM, null));
        commentReportRepository.save(new CommentReport(commentC.getId(), reporterC.getId(), CommentReportReason.ABUSE, null));

        mockMvc.perform(get("/admin/comment-reports/users")
                        .with(httpBasic("admin", "1234")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].totalCount").value(3))
                .andExpect(jsonPath("$[0].reasonCounts.SPAM").value(2))
                .andExpect(jsonPath("$[0].reasonCounts.ABUSE").value(1))
                .andExpect(jsonPath("$[0].reasonCounts.PRIVACY").doesNotExist());
    }

    @Test
    void updateStatus_RESOLVED로_전환되고_댓글_내용에는_영향이_없다() throws Exception {
        User reporter = userRepository.save(new User(AuthProvider.GOOGLE, "reporter-8", null, "상태전환신고자"));
        Comment comment = saveComment("sha256", "상태 전환 대상 댓글", null);
        CommentReport report = commentReportRepository.save(
                new CommentReport(comment.getId(), reporter.getId(), CommentReportReason.SPAM, null));

        mockMvc.perform(patch("/admin/comment-reports/" + report.getId() + "/status")
                        .with(httpBasic("admin", "1234"))
                        .contentType("application/json")
                        .content("{\"status\":\"RESOLVED\"}"))
                .andExpect(status().isNoContent());

        CommentReport updated = commentReportRepository.findById(report.getId()).orElseThrow();
        assertThat(updated.getStatus()).isEqualTo(CommentReportStatus.RESOLVED);

        // 부수효과 없음 확인 — 댓글은 그대로 존재하고 내용도 바뀌지 않는다.
        Comment stillThere = commentRepository.findById(comment.getId()).orElseThrow();
        assertThat(stillThere.getContent()).isEqualTo("상태 전환 대상 댓글");

        // 신고 상태 전환은 "검토 여부" 표시일 뿐 파괴적 조치가 아니라 058 감사로그 대상이 아니다.
        assertThat(adminActionLogRepository.findAll()).isEmpty();
    }

    @Test
    void updateStatus_DISMISSED로도_전환할_수_있다() throws Exception {
        User reporter = userRepository.save(new User(AuthProvider.GOOGLE, "reporter-9", null, "기각신고자"));
        Comment comment = saveComment("sha256", "기각 대상 댓글", null);
        CommentReport report = commentReportRepository.save(
                new CommentReport(comment.getId(), reporter.getId(), CommentReportReason.OTHER, "근거 없음"));

        mockMvc.perform(patch("/admin/comment-reports/" + report.getId() + "/status")
                        .with(httpBasic("admin", "1234"))
                        .contentType("application/json")
                        .content("{\"status\":\"DISMISSED\"}"))
                .andExpect(status().isNoContent());

        CommentReport updated = commentReportRepository.findById(report.getId()).orElseThrow();
        assertThat(updated.getStatus()).isEqualTo(CommentReportStatus.DISMISSED);
    }

    @Test
    void updateStatus_status를_생략하면_400_VALIDATION_FAILED이고_상태가_바뀌지_않는다() throws Exception {
        User reporter = userRepository.save(new User(AuthProvider.GOOGLE, "reporter-10", null, "검증신고자"));
        Comment comment = saveComment("sha256", "검증 대상 댓글", null);
        CommentReport report = commentReportRepository.save(
                new CommentReport(comment.getId(), reporter.getId(), CommentReportReason.SPAM, null));

        mockMvc.perform(patch("/admin/comment-reports/" + report.getId() + "/status")
                        .with(httpBasic("admin", "1234"))
                        .contentType("application/json")
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));

        CommentReport unchanged = commentReportRepository.findById(report.getId()).orElseThrow();
        assertThat(unchanged.getStatus()).isEqualTo(CommentReportStatus.PENDING);
    }

    @Test
    void updateStatus_존재하지_않는_신고면_404() throws Exception {
        mockMvc.perform(patch("/admin/comment-reports/999999/status")
                        .with(httpBasic("admin", "1234"))
                        .contentType("application/json")
                        .content("{\"status\":\"RESOLVED\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("COMMENT_REPORT_NOT_FOUND"));
    }

    private Comment saveComment(String moduleId, String content, Long userId) {
        Comment comment = new Comment();
        comment.setModuleId(moduleId);
        comment.setContent(content);
        comment.setUserId(userId);
        return commentRepository.save(comment);
    }
}
