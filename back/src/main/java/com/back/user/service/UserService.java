package com.back.user.service;

import com.back.global.exception.AppException;
import com.back.global.exception.ErrorCode;
import com.back.global.util.DashboardDateRange;
import com.back.user.dto.DailySignupCount;
import com.back.user.entity.AuthProvider;
import com.back.user.entity.User;
import com.back.user.entity.UserStatus;
import com.back.user.oauth2.OAuth2UserAttributes;
import com.back.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class UserService {

    private static final int NICKNAME_MAX_LENGTH = 20;
    private static final String DEFAULT_NICKNAME = "사용자";

    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public User getById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED));
    }

    @Transactional(readOnly = true)
    public User getExistingById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
    }

    @Transactional(readOnly = true)
    public Page<User> search(String query, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return userRepository.search(query == null ? "" : query, pageable);
    }

    @Transactional
    public User updateNickname(Long userId, String nickname) {
        User user = getById(userId);
        user.setNickname(nickname);
        return user;
    }

    /** 회원 정지(056) — 댓글 작성만 막는다, 로그인·좋아요는 그대로. */
    @Transactional
    public User suspend(Long userId) {
        User user = getExistingById(userId);
        user.setStatus(UserStatus.SUSPENDED);
        return user;
    }

    @Transactional
    public User unsuspend(Long userId) {
        User user = getExistingById(userId);
        user.setStatus(UserStatus.ACTIVE);
        return user;
    }

    @Transactional
    public User upsertFromSocialLogin(OAuth2UserAttributes attrs) {
        return upsertFromSocialLogin(attrs.provider(), attrs.providerId(), attrs.email(), attrs.nickname());
    }

    // 재로그인 시 소셜 프로필명으로 기존 닉네임을 덮어쓰지 않는다(ADR-0024) — 첫 로그인일 때만 새로 만든다.
    @Transactional
    public User upsertFromSocialLogin(AuthProvider provider, String providerId, String email, String socialNickname) {
        return userRepository.findByProviderAndProviderId(provider, providerId)
                .orElseGet(() -> userRepository.save(new User(provider, providerId, email, truncateNickname(socialNickname))));
    }

    private String truncateNickname(String nickname) {
        String trimmed = (nickname == null || nickname.isBlank()) ? DEFAULT_NICKNAME : nickname.trim();
        // substring(0, 20)은 UTF-16 유닛 기준이라 서로게이트 쌍(이모지 등)을 한가운데서 자를 수 있다 —
        // 코드포인트 기준으로 잘라야 20번째 "글자"가 항상 온전하다.
        if (trimmed.codePointCount(0, trimmed.length()) <= NICKNAME_MAX_LENGTH) {
            return trimmed;
        }
        int cutIndex = trimmed.offsetByCodePoints(0, NICKNAME_MAX_LENGTH);
        return trimmed.substring(0, cutIndex);
    }

    /** 어드민 대시보드(118) — 가입 경로(provider)별 전체 유저 분포. 그룹 집계는 리포지토리에 그대로 위임한다. */
    @Transactional(readOnly = true)
    public List<UserRepository.ProviderCount> getProviderDistribution() {
        return userRepository.countGroupedByProvider();
    }

    /**
     * 어드민 대시보드(118) — 최근 days일 일별 신규 가입자 수. 데이터 없는 날짜도 0으로 채워
     * 라인 차트에 구멍이 생기지 않게 한다(job의 getDailyJobCounts와 같은 방식, 118).
     */
    @Transactional(readOnly = true)
    public List<DailySignupCount> getDailySignups(int days) {
        int clampedDays = DashboardDateRange.clampDays(days);
        LocalDate today = LocalDate.now();
        LocalDate start = today.minusDays(clampedDays - 1L);

        Map<LocalDate, Long> byDate = new HashMap<>();
        for (UserRepository.DailySignupRow row : userRepository.countGroupedByDateSince(start.atStartOfDay())) {
            byDate.merge(row.getDate(), row.getCount(), Long::sum);
        }

        List<DailySignupCount> result = new ArrayList<>();
        for (LocalDate d = start; !d.isAfter(today); d = d.plusDays(1)) {
            result.add(new DailySignupCount(d, byDate.getOrDefault(d, 0L)));
        }
        return result;
    }
}
