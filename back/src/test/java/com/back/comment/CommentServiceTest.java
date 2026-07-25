package com.back.comment;

import com.back.AbstractMySQLIntegrationTest;
import com.back.comment.entity.Comment;
import com.back.comment.repository.CommentRepository;
import com.back.comment.service.CommentService;
import com.back.global.exception.AppException;
import com.back.global.exception.ErrorCode;
import com.back.user.entity.AuthProvider;
import com.back.user.entity.User;
import com.back.user.entity.UserStatus;
import com.back.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("local")
@TestPropertySource(properties = {
        "storage.upload-dir=build/test-uploads",
        "scheduling.worker.delay=60000",
        "scheduling.ttl.delay=60000"
})
class CommentServiceTest extends AbstractMySQLIntegrationTest {

    @Autowired
    CommentService commentService;

    @Autowired
    CommentRepository commentRepository;

    @Autowired
    UserRepository userRepository;

    @BeforeEach
    void cleanUp() {
        commentRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void addComment_savesAndReturns() {
        Comment comment = commentService.addComment("sql-formatter", "좋은 도구입니다!", null);

        assertThat(comment.getId()).isNotNull();
        assertThat(comment.getModuleId()).isEqualTo("sql-formatter");
        assertThat(comment.getContent()).isEqualTo("좋은 도구입니다!");
        assertThat(comment.getCreatedAt()).isNotNull();
    }

    @Test
    void getComments_returnsOrderedByCreatedAtDesc() {
        commentService.addComment("sql-formatter", "첫 번째 댓글", null);
        commentService.addComment("sql-formatter", "두 번째 댓글", null);

        List<Comment> comments = commentService.getComments("sql-formatter");

        assertThat(comments).hasSize(2);
        // DESC 순서이므로 최신이 먼저
        assertThat(comments.get(0).getContent()).isEqualTo("두 번째 댓글");
        assertThat(comments.get(1).getContent()).isEqualTo("첫 번째 댓글");
    }

    @Test
    void getComments_differentModuleId_returnsEmpty() {
        commentService.addComment("sql-formatter", "SQL 댓글", null);

        List<Comment> comments = commentService.getComments("json-yaml");

        assertThat(comments).isEmpty();
    }

    @Test
    void addComment_정지된_유저는_거부된다() {
        User suspended = userRepository.save(new User(AuthProvider.GOOGLE, "suspend-1", null, "정지유저"));
        suspended.setStatus(UserStatus.SUSPENDED);
        userRepository.save(suspended);

        assertThatThrownBy(() -> commentService.addComment("sql-formatter", "댓글 시도", suspended.getId()))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.USER_SUSPENDED);
        assertThat(commentRepository.findAllByModuleIdOrderByCreatedAtDesc("sql-formatter")).isEmpty();
    }

    @Test
    void addComment_정지_안된_유저는_정상_작성된다() {
        User active = userRepository.save(new User(AuthProvider.GOOGLE, "active-1", null, "정상유저"));

        Comment comment = commentService.addComment("sql-formatter", "정상 댓글", active.getId());

        assertThat(comment.getId()).isNotNull();
        assertThat(commentRepository.findAllByModuleIdOrderByCreatedAtDesc("sql-formatter")).hasSize(1);
    }
}
