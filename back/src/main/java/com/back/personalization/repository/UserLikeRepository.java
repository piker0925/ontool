package com.back.personalization.repository;

import com.back.personalization.entity.UserLike;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserLikeRepository extends JpaRepository<UserLike, Long> {

    List<UserLike> findAllByUserIdOrderByCreatedAtDesc(Long userId);

    Optional<UserLike> findByUserIdAndModuleId(Long userId, String moduleId);

    boolean existsByUserIdAndModuleId(Long userId, String moduleId);

    /** 회원 탈퇴(055-②) — 개인화 데이터 삭제. */
    void deleteAllByUserId(Long userId);
}
