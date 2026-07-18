package com.back.comment;

import com.back.AbstractMySQLIntegrationTest;
import com.back.comment.entity.Comment;
import com.back.comment.repository.CommentRepository;
import com.back.comment.service.CommentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

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

    @BeforeEach
    void cleanUp() {
        commentRepository.deleteAll();
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
}
