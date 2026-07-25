package com.back.user.repository;

import com.back.user.entity.AuthProvider;
import com.back.user.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByProviderAndProviderId(AuthProvider provider, String providerId);

    @Query("SELECT u FROM User u WHERE LOWER(u.nickname) LIKE LOWER(CONCAT('%', :search, '%')) " +
            "OR LOWER(CAST(u.provider AS string)) LIKE LOWER(CONCAT('%', :search, '%'))")
    Page<User> search(@Param("search") String search, Pageable pageable);

    /** 어드민 대시보드(118) — 가입 경로(provider)별 전체 유저 분포 파이 차트용. */
    @Query("select u.provider as provider, count(u) as count from User u group by u.provider")
    List<ProviderCount> countGroupedByProvider();

    /** 어드민 대시보드(118) — 최근 N일 일별 신규 가입자 수. 빈 날짜 0 채우기는 UserService가 맡는다. */
    @Query(value = "SELECT DATE(created_at) as date, COUNT(*) as count FROM app_user " +
            "WHERE created_at >= :since GROUP BY DATE(created_at) ORDER BY date",
            nativeQuery = true)
    List<DailySignupRow> countGroupedByDateSince(@Param("since") LocalDateTime since);

    interface ProviderCount {
        AuthProvider getProvider();
        Long getCount();
    }

    interface DailySignupRow {
        LocalDate getDate();
        Long getCount();
    }
}
