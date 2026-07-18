package com.back.user.service;

import com.back.comment.repository.CommentRepository;
import com.back.global.exception.AppException;
import com.back.global.exception.ErrorCode;
import com.back.job.repository.JobRepository;
import com.back.personalization.repository.UserFavoriteRepository;
import com.back.personalization.repository.UserLikeRepository;
import com.back.personalization.repository.UserRecentToolRepository;
import com.back.user.entity.User;
import com.back.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 회원 탈퇴(055-②, ADR-0024) — User row와 회원에 종속된 데이터를 정리한다.
 * 댓글·Job은 삭제가 아니라 user_id를 끊는 익명화다(내용/집계는 유지).
 * 소셜 연결 끊기(카카오 unlink·구글 revoke)는 이 트랜잭션 밖에서 별도로 best-effort 시도한다
 * — 여기 포함하면 외부 API 실패가 탈퇴 자체를 롤백시켜버린다.
 */
@Service
@RequiredArgsConstructor
public class UserWithdrawalService {

    private final UserRepository userRepository;
    private final RefreshTokenService refreshTokenService;
    private final UserFavoriteRepository userFavoriteRepository;
    private final UserRecentToolRepository userRecentToolRepository;
    private final UserLikeRepository userLikeRepository;
    private final CommentRepository commentRepository;
    private final JobRepository jobRepository;

    @Transactional
    public User withdraw(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        refreshTokenService.forceLogout(userId);
        userFavoriteRepository.deleteAllByUserId(userId);
        userRecentToolRepository.deleteAllByUserId(userId);
        userLikeRepository.deleteAllByUserId(userId);
        commentRepository.anonymizeByUserId(userId);
        jobRepository.anonymizeByUserId(userId);
        userRepository.delete(user);

        return user;
    }
}
