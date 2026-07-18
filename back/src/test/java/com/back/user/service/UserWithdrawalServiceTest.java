package com.back.user.service;

import com.back.AbstractMySQLIntegrationTest;
import com.back.comment.entity.Comment;
import com.back.comment.repository.CommentRepository;
import com.back.job.entity.Job;
import com.back.job.entity.JobStatus;
import com.back.job.repository.JobRepository;
import com.back.personalization.entity.UserFavorite;
import com.back.personalization.entity.UserLike;
import com.back.personalization.entity.UserRecentTool;
import com.back.personalization.repository.UserFavoriteRepository;
import com.back.personalization.repository.UserLikeRepository;
import com.back.personalization.repository.UserRecentToolRepository;
import com.back.user.entity.AuthProvider;
import com.back.user.entity.User;
import com.back.user.repository.RefreshTokenRepository;
import com.back.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("local")
@TestPropertySource(properties = {
        "storage.upload-dir=build/test-uploads",
        "scheduling.worker.delay=60000",
        "scheduling.ttl.delay=60000"
})
class UserWithdrawalServiceTest extends AbstractMySQLIntegrationTest {

    @Autowired
    UserWithdrawalService userWithdrawalService;
    @Autowired
    UserRepository userRepository;
    @Autowired
    RefreshTokenService refreshTokenService;
    @Autowired
    RefreshTokenRepository refreshTokenRepository;
    @Autowired
    UserFavoriteRepository userFavoriteRepository;
    @Autowired
    UserRecentToolRepository userRecentToolRepository;
    @Autowired
    UserLikeRepository userLikeRepository;
    @Autowired
    CommentRepository commentRepository;
    @Autowired
    JobRepository jobRepository;

    @BeforeEach
    void cleanup() {
        commentRepository.deleteAll();
        jobRepository.deleteAll();
        userFavoriteRepository.deleteAll();
        userRecentToolRepository.deleteAll();
        userLikeRepository.deleteAll();
        refreshTokenRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void 탈퇴하면_User_row와_토큰_개인화_데이터가_삭제되고_다른_회원_개인화_데이터는_영향없다() {
        User user = userRepository.save(new User(AuthProvider.GOOGLE, "w1", "w1@test.com", "탈퇴할유저"));
        User other = userRepository.save(new User(AuthProvider.GOOGLE, "w1b", null, "잔류회원"));
        refreshTokenService.issue(user.getId());
        userFavoriteRepository.save(new UserFavorite(user.getId(), "sha256"));
        userRecentToolRepository.save(new UserRecentTool(user.getId(), "sha256", LocalDateTime.now()));
        userLikeRepository.save(new UserLike(user.getId(), "sha256"));
        userFavoriteRepository.save(new UserFavorite(other.getId(), "sha256"));
        userRecentToolRepository.save(new UserRecentTool(other.getId(), "sha256", LocalDateTime.now()));
        userLikeRepository.save(new UserLike(other.getId(), "sha256"));

        userWithdrawalService.withdraw(user.getId());

        assertThat(userRepository.findById(user.getId())).isEmpty();
        assertThat(refreshTokenRepository.findAllByUserId(user.getId())).isEmpty();
        assertThat(userFavoriteRepository.findAllByUserIdOrderByCreatedAtDesc(user.getId())).isEmpty();
        assertThat(userRecentToolRepository.findAllByUserIdOrderByLastUsedAtDesc(user.getId())).isEmpty();
        assertThat(userLikeRepository.findAllByUserIdOrderByCreatedAtDesc(user.getId())).isEmpty();

        assertThat(userRepository.findById(other.getId())).isPresent();
        assertThat(userFavoriteRepository.findAllByUserIdOrderByCreatedAtDesc(other.getId())).hasSize(1);
        assertThat(userRecentToolRepository.findAllByUserIdOrderByLastUsedAtDesc(other.getId())).hasSize(1);
        assertThat(userLikeRepository.findAllByUserIdOrderByCreatedAtDesc(other.getId())).hasSize(1);
    }

    @Test
    void 탈퇴하면_본인_댓글은_내용을_유지한채_익명화되고_다른_회원_댓글은_영향없다() {
        User withdrawing = userRepository.save(new User(AuthProvider.GOOGLE, "w2", null, "탈퇴자"));
        User other = userRepository.save(new User(AuthProvider.GOOGLE, "w3", null, "잔류자"));
        Comment mine = new Comment();
        mine.setModuleId("sha256");
        mine.setContent("탈퇴 전 작성한 댓글");
        mine.setUserId(withdrawing.getId());
        commentRepository.save(mine);
        Comment others = new Comment();
        others.setModuleId("sha256");
        others.setContent("다른 회원 댓글");
        others.setUserId(other.getId());
        commentRepository.save(others);

        userWithdrawalService.withdraw(withdrawing.getId());

        Comment reloadedMine = commentRepository.findById(mine.getId()).orElseThrow();
        assertThat(reloadedMine.getUserId()).isNull();
        assertThat(reloadedMine.getContent()).isEqualTo("탈퇴 전 작성한 댓글");

        Comment reloadedOthers = commentRepository.findById(others.getId()).orElseThrow();
        assertThat(reloadedOthers.getUserId()).isEqualTo(other.getId());
    }

    @Test
    void 탈퇴하면_본인_Job의_user_id만_null이_되고_row는_남으며_다른_회원_Job은_영향없다() {
        User withdrawing = userRepository.save(new User(AuthProvider.GOOGLE, "w4", null, "탈퇴자"));
        User other = userRepository.save(new User(AuthProvider.GOOGLE, "w5", null, "잔류자"));
        Job mine = new Job();
        mine.setModuleId("sha256");
        mine.setStatus(JobStatus.DONE);
        mine.setUserId(withdrawing.getId());
        mine.setExpiresAt(LocalDateTime.now().plusHours(1));
        jobRepository.save(mine);
        Job others = new Job();
        others.setModuleId("sha256");
        others.setStatus(JobStatus.DONE);
        others.setUserId(other.getId());
        others.setExpiresAt(LocalDateTime.now().plusHours(1));
        jobRepository.save(others);

        userWithdrawalService.withdraw(withdrawing.getId());

        Job reloadedMine = jobRepository.findById(mine.getId()).orElseThrow();
        assertThat(reloadedMine.getUserId()).isNull();

        Job reloadedOthers = jobRepository.findById(others.getId()).orElseThrow();
        assertThat(reloadedOthers.getUserId()).isEqualTo(other.getId());
    }
}
