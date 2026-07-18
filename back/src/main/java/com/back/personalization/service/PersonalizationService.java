package com.back.personalization.service;

import com.back.personalization.dto.PersonalizationMergeRequest;
import com.back.personalization.dto.PersonalizationResponse;
import com.back.personalization.entity.UserFavorite;
import com.back.personalization.entity.UserLike;
import com.back.personalization.entity.UserRecentTool;
import com.back.personalization.repository.UserFavoriteRepository;
import com.back.personalization.repository.UserLikeRepository;
import com.back.personalization.repository.UserRecentToolRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PersonalizationService {

    private static final int MAX_RECENT_TOOLS = 6;

    private final UserFavoriteRepository userFavoriteRepository;
    private final UserRecentToolRepository userRecentToolRepository;
    private final UserLikeRepository userLikeRepository;

    @Transactional(readOnly = true)
    public PersonalizationResponse getPersonalization(Long userId) {
        return new PersonalizationResponse(
                userFavoriteRepository.findAllByUserIdOrderByCreatedAtDesc(userId).stream()
                        .map(UserFavorite::getModuleId).toList(),
                userRecentToolRepository.findAllByUserIdOrderByLastUsedAtDesc(userId).stream()
                        .map(UserRecentTool::getModuleId).toList(),
                userLikeRepository.findAllByUserIdOrderByCreatedAtDesc(userId).stream()
                        .map(UserLike::getModuleId).toList()
        );
    }

    @Transactional
    public void addFavorite(Long userId, String moduleId) {
        if (!userFavoriteRepository.existsByUserIdAndModuleId(userId, moduleId)) {
            userFavoriteRepository.save(new UserFavorite(userId, moduleId));
        }
    }

    @Transactional
    public void removeFavorite(Long userId, String moduleId) {
        userFavoriteRepository.findByUserIdAndModuleId(userId, moduleId)
                .ifPresent(userFavoriteRepository::delete);
    }

    @Transactional
    public void recordRecentTool(Long userId, String moduleId) {
        LocalDateTime now = LocalDateTime.now();
        UserRecentTool tool = userRecentToolRepository.findByUserIdAndModuleId(userId, moduleId)
                .orElseGet(() -> new UserRecentTool(userId, moduleId, now));
        tool.setLastUsedAt(now);
        userRecentToolRepository.save(tool);

        evictOldestRecentToolsBeyondCap(userId);
    }

    private void evictOldestRecentToolsBeyondCap(Long userId) {
        List<UserRecentTool> all = userRecentToolRepository.findAllByUserIdOrderByLastUsedAtDesc(userId);
        if (all.size() > MAX_RECENT_TOOLS) {
            userRecentToolRepository.deleteAll(all.subList(MAX_RECENT_TOOLS, all.size()));
        }
    }

    /** 이미 좋아요한 상태가 아니면 소유권 레코드를 남기고 true, 이미 좋아요한 상태면 아무 것도 안 하고 false. */
    @Transactional
    public boolean likeIfAbsent(Long userId, String moduleId) {
        if (userLikeRepository.existsByUserIdAndModuleId(userId, moduleId)) {
            return false;
        }
        userLikeRepository.save(new UserLike(userId, moduleId));
        return true;
    }

    /** 좋아요 상태였으면 소유권 레코드를 지우고 true, 애초에 좋아요 상태가 아니었으면 false. */
    @Transactional
    public boolean unlikeIfPresent(Long userId, String moduleId) {
        return userLikeRepository.findByUserIdAndModuleId(userId, moduleId)
                .map(like -> {
                    userLikeRepository.delete(like);
                    return true;
                })
                .orElse(false);
    }

    /**
     * 기기별 1회 병합(ADR-0024) — 비로그인 localStorage 상태를 계정과 합집합한다.
     * 즐겨찾기·좋아요는 이미 없는 것만 추가(멱등). 좋아요는 전역 카운터를 건드리지 않는다 —
     * 익명일 때 이미 +1된 값의 소유권만 옮기는 것이라 여기서 다시 올리면 중복 집계가 된다.
     */
    @Transactional
    public void merge(Long userId, PersonalizationMergeRequest request) {
        request.favorites().forEach(moduleId -> addFavorite(userId, moduleId));
        request.likes().forEach(moduleId -> likeIfAbsent(userId, moduleId));
        mergeRecentTools(userId, request.recentTools());
    }

    private void mergeRecentTools(Long userId, List<String> moduleIds) {
        LocalDateTime base = LocalDateTime.now();
        for (int i = 0; i < moduleIds.size(); i++) {
            String moduleId = moduleIds.get(i);
            if (userRecentToolRepository.findByUserIdAndModuleId(userId, moduleId).isEmpty()) {
                // 클라이언트 배열은 최신순으로 온다고 가정 — 뒤로 갈수록 더 오래된 것으로 취급한다.
                userRecentToolRepository.save(new UserRecentTool(userId, moduleId, base.minusSeconds(i + 1)));
            }
        }

        evictOldestRecentToolsBeyondCap(userId);
    }
}
