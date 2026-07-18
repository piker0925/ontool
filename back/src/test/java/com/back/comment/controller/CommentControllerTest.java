package com.back.comment.controller;

import com.back.AbstractMySQLIntegrationTest;
import com.back.comment.entity.Comment;
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

import static org.hamcrest.Matchers.nullValue;
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
        "scheduling.worker.delay=60000",
        "scheduling.ttl.delay=60000"
})
class CommentControllerTest extends AbstractMySQLIntegrationTest {

    @Autowired
    WebApplicationContext wac;
    @Autowired
    UserRepository userRepository;
    @Autowired
    CommentRepository commentRepository;
    @Autowired
    JwtProvider jwtProvider;

    MockMvc mockMvc;

    @BeforeEach
    void setup() {
        commentRepository.deleteAll();
        userRepository.deleteAll();
        mockMvc = MockMvcBuilders.webAppContextSetup(wac).apply(springSecurity()).build();
    }

    @Test
    void 로그인_작성시_닉네임이_표시된다() throws Exception {
        User user = userRepository.save(new User(AuthProvider.GOOGLE, "h1", null, "닉네임유저"));
        String token = jwtProvider.issueAccessToken(user.getId());

        mockMvc.perform(post("/api/v1/tools/sha256/comments")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"content\":\"좋아요\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.nickname").value("닉네임유저"));
    }

    @Test
    void 비로그인_작성시_닉네임은_null이다() throws Exception {
        mockMvc.perform(post("/api/v1/tools/sha256/comments")
                        .contentType("application/json")
                        .content("{\"content\":\"익명 댓글\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.nickname").value(nullValue()));
    }

    @Test
    void 댓글_목록에_회원과_익명_닉네임이_섞여서_표시된다() throws Exception {
        User user = userRepository.save(new User(AuthProvider.GOOGLE, "h2", null, "목록유저"));
        saveComment("sha256", "회원 댓글", user.getId());
        saveComment("sha256", "익명 댓글", null);

        mockMvc.perform(get("/api/v1/tools/sha256/comments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].nickname").value(nullValue()))
                .andExpect(jsonPath("$[1].nickname").value("목록유저"));
    }

    @Test
    void 본인_댓글은_삭제된다() throws Exception {
        User user = userRepository.save(new User(AuthProvider.GOOGLE, "h3", null, "삭제유저"));
        String token = jwtProvider.issueAccessToken(user.getId());
        Comment comment = saveComment("sha256", "내 댓글", user.getId());

        mockMvc.perform(delete("/api/v1/comments/" + comment.getId())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        assertCommentGone(comment.getId());
    }

    @Test
    void 타인_댓글_삭제는_403이고_삭제되지_않는다() throws Exception {
        User owner = userRepository.save(new User(AuthProvider.GOOGLE, "h4", null, "주인"));
        User intruder = userRepository.save(new User(AuthProvider.GOOGLE, "h5", null, "침입자"));
        String intruderToken = jwtProvider.issueAccessToken(intruder.getId());
        Comment comment = saveComment("sha256", "주인 댓글", owner.getId());

        mockMvc.perform(delete("/api/v1/comments/" + comment.getId())
                        .header("Authorization", "Bearer " + intruderToken))
                .andExpect(status().isForbidden());

        assertCommentExists(comment.getId());
    }

    @Test
    void 익명_댓글은_로그인해도_삭제할_수_없다() throws Exception {
        User user = userRepository.save(new User(AuthProvider.GOOGLE, "h6", null, "유저"));
        String token = jwtProvider.issueAccessToken(user.getId());
        Comment comment = saveComment("sha256", "익명 댓글", null);

        mockMvc.perform(delete("/api/v1/comments/" + comment.getId())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());

        assertCommentExists(comment.getId());
    }

    @Test
    void 비로그인으로_삭제_시도하면_401() throws Exception {
        Comment comment = saveComment("sha256", "댓글", null);

        mockMvc.perform(delete("/api/v1/comments/" + comment.getId()))
                .andExpect(status().isUnauthorized());

        assertCommentExists(comment.getId());
    }

    private Comment saveComment(String moduleId, String content, Long userId) {
        Comment comment = new Comment();
        comment.setModuleId(moduleId);
        comment.setContent(content);
        comment.setUserId(userId);
        return commentRepository.save(comment);
    }

    private void assertCommentGone(Long id) {
        org.assertj.core.api.Assertions.assertThat(commentRepository.findById(id)).isEmpty();
    }

    private void assertCommentExists(Long id) {
        org.assertj.core.api.Assertions.assertThat(commentRepository.findById(id)).isPresent();
    }
}
