package com.back.comment.controller;

import com.back.AbstractMySQLIntegrationTest;
import com.back.comment.entity.Comment;
import com.back.comment.entity.CommentReport;
import com.back.comment.repository.CommentReportRepository;
import com.back.comment.repository.CommentRepository;
import com.back.global.security.jwt.JwtProvider;
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

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("local")
@TestPropertySource(properties = {
        "storage.upload-dir=build/test-uploads",
        "scheduling.worker.delay=60000",
        "scheduling.ttl.delay=60000"
})
class CommentReportControllerTest extends AbstractMySQLIntegrationTest {

    @Autowired
    WebApplicationContext wac;
    @Autowired
    UserRepository userRepository;
    @Autowired
    CommentRepository commentRepository;
    @Autowired
    CommentReportRepository commentReportRepository;
    @Autowired
    JwtProvider jwtProvider;

    MockMvc mockMvc;

    @BeforeEach
    void setup() {
        commentReportRepository.deleteAll();
        commentRepository.deleteAll();
        userRepository.deleteAll();
        mockMvc = MockMvcBuilders.webAppContextSetup(wac).apply(springSecurity()).build();
    }

    @Test
    void 로그인_유저가_댓글을_신고하면_등록된다() throws Exception {
        User reporter = userRepository.save(new User(AuthProvider.GOOGLE, "r1", null, "신고자"));
        String token = jwtProvider.issueAccessToken(reporter.getId());
        Comment comment = saveComment("sha256", "스팸성 댓글", null);

        mockMvc.perform(post("/api/v1/comments/" + comment.getId() + "/report")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"reason\":\"SPAM\"}"))
                .andExpect(status().isCreated());

        List<CommentReport> reports = commentReportRepository.findAll();
        assertThat(reports).hasSize(1);
        assertThat(reports.get(0).getCommentId()).isEqualTo(comment.getId());
        assertThat(reports.get(0).getReporterId()).isEqualTo(reporter.getId());
        assertThat(reports.get(0).getReason().name()).isEqualTo("SPAM");
        assertThat(reports.get(0).getStatus().name()).isEqualTo("PENDING");
    }

    @Test
    void reason을_생략하고_신고하면_400_VALIDATION_FAILED이고_저장되지_않는다() throws Exception {
        User reporter = userRepository.save(new User(AuthProvider.GOOGLE, "r10", null, "신고자10"));
        String token = jwtProvider.issueAccessToken(reporter.getId());
        Comment comment = saveComment("sha256", "사유없는_신고_대상", null);

        mockMvc.perform(post("/api/v1/comments/" + comment.getId() + "/report")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));

        assertThat(commentReportRepository.findAll()).isEmpty();
    }

    @Test
    void OTHER_사유는_detail_없이_신고하면_400이고_저장되지_않는다() throws Exception {
        User reporter = userRepository.save(new User(AuthProvider.GOOGLE, "r2", null, "신고자2"));
        String token = jwtProvider.issueAccessToken(reporter.getId());
        Comment comment = saveComment("sha256", "애매한 댓글", null);

        mockMvc.perform(post("/api/v1/comments/" + comment.getId() + "/report")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"reason\":\"OTHER\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("COMMENT_REPORT_DETAIL_REQUIRED"));

        assertThat(commentReportRepository.findAll()).isEmpty();
    }

    @Test
    void OTHER_사유에_detail을_포함하면_신고가_등록되고_detail_내용이_그대로_저장된다() throws Exception {
        User reporter = userRepository.save(new User(AuthProvider.GOOGLE, "r3", null, "신고자3"));
        String token = jwtProvider.issueAccessToken(reporter.getId());
        Comment comment = saveComment("sha256", "기타 사유 댓글", null);

        mockMvc.perform(post("/api/v1/comments/" + comment.getId() + "/report")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"reason\":\"OTHER\",\"detail\":\"저작권 침해로 보입니다\"}"))
                .andExpect(status().isCreated());

        List<CommentReport> reports = commentReportRepository.findAll();
        assertThat(reports).hasSize(1);
        assertThat(reports.get(0).getDetail()).isEqualTo("저작권 침해로 보입니다");
    }

    @Test
    void 같은_유저가_같은_댓글을_두번_신고하면_두번째는_409이고_한_건만_남는다() throws Exception {
        User reporter = userRepository.save(new User(AuthProvider.GOOGLE, "r4", null, "중복신고자"));
        String token = jwtProvider.issueAccessToken(reporter.getId());
        Comment comment = saveComment("sha256", "중복 신고 대상", null);

        mockMvc.perform(post("/api/v1/comments/" + comment.getId() + "/report")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"reason\":\"ABUSE\"}"))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/v1/comments/" + comment.getId() + "/report")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"reason\":\"SPAM\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("COMMENT_REPORT_DUPLICATE"));

        assertThat(commentReportRepository.findAll()).hasSize(1);
    }

    @Test
    void 다른_유저는_같은_댓글을_신고할_수_있다() throws Exception {
        User reporterA = userRepository.save(new User(AuthProvider.GOOGLE, "r5", null, "신고자A"));
        User reporterB = userRepository.save(new User(AuthProvider.KAKAO, "r6", null, "신고자B"));
        String tokenA = jwtProvider.issueAccessToken(reporterA.getId());
        String tokenB = jwtProvider.issueAccessToken(reporterB.getId());
        Comment comment = saveComment("sha256", "여러명이_신고하는_댓글", null);

        mockMvc.perform(post("/api/v1/comments/" + comment.getId() + "/report")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType("application/json")
                        .content("{\"reason\":\"SPAM\"}"))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/v1/comments/" + comment.getId() + "/report")
                        .header("Authorization", "Bearer " + tokenB)
                        .contentType("application/json")
                        .content("{\"reason\":\"ABUSE\"}"))
                .andExpect(status().isCreated());

        assertThat(commentReportRepository.findAll()).hasSize(2);
    }

    @Test
    void 비로그인으로_신고_시도하면_401이고_저장되지_않는다() throws Exception {
        Comment comment = saveComment("sha256", "비로그인 신고 대상", null);

        mockMvc.perform(post("/api/v1/comments/" + comment.getId() + "/report")
                        .contentType("application/json")
                        .content("{\"reason\":\"SPAM\"}"))
                .andExpect(status().isUnauthorized());

        assertThat(commentReportRepository.findAll()).isEmpty();
    }

    @Test
    void 익명_댓글도_로그인_유저가_신고할_수_있다() throws Exception {
        User reporter = userRepository.save(new User(AuthProvider.GOOGLE, "r7", null, "신고자7"));
        String token = jwtProvider.issueAccessToken(reporter.getId());
        Comment anonymousComment = saveComment("sha256", "익명 댓글", null);

        mockMvc.perform(post("/api/v1/comments/" + anonymousComment.getId() + "/report")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"reason\":\"PRIVACY\"}"))
                .andExpect(status().isCreated());

        assertThat(commentReportRepository.findAll()).hasSize(1);
    }

    @Test
    void 존재하지_않는_댓글을_신고하면_404이고_저장되지_않는다() throws Exception {
        User reporter = userRepository.save(new User(AuthProvider.GOOGLE, "r8", null, "신고자8"));
        String token = jwtProvider.issueAccessToken(reporter.getId());

        mockMvc.perform(post("/api/v1/comments/999999/report")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"reason\":\"SPAM\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("COMMENT_NOT_FOUND"));

        assertThat(commentReportRepository.findAll()).isEmpty();
    }

    @Test
    void 신고가_존재해도_댓글_목록_응답에는_신고자_정보가_노출되지_않는다() throws Exception {
        User reporter = userRepository.save(new User(AuthProvider.GOOGLE, "r9", null, "신고자9"));
        String token = jwtProvider.issueAccessToken(reporter.getId());
        Comment comment = saveComment("sha256", "피신고 댓글", null);

        mockMvc.perform(post("/api/v1/comments/" + comment.getId() + "/report")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"reason\":\"SPAM\"}"))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/v1/tools/sha256/comments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].reporterId").doesNotExist())
                .andExpect(jsonPath("$[0].reporterNickname").doesNotExist())
                .andExpect(jsonPath("$[0].reportCount").doesNotExist());
    }

    private Comment saveComment(String moduleId, String content, Long userId) {
        Comment comment = new Comment();
        comment.setModuleId(moduleId);
        comment.setContent(content);
        comment.setUserId(userId);
        return commentRepository.save(comment);
    }
}
