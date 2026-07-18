package com.back.personalization.repository;

import com.back.personalization.entity.UserRecentTool;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRecentToolRepository extends JpaRepository<UserRecentTool, Long> {

    List<UserRecentTool> findAllByUserIdOrderByLastUsedAtDesc(Long userId);

    Optional<UserRecentTool> findByUserIdAndModuleId(Long userId, String moduleId);

    /** 회원 탈퇴(055-②) — 개인화 데이터 삭제. */
    void deleteAllByUserId(Long userId);
}
