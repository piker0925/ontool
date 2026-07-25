package com.back.admin;

import com.back.job.dto.DailyJobCount;
import com.back.job.repository.JobRepository;
import com.back.job.service.AdmissionControl;
import com.back.user.dto.DailySignupCount;
import com.back.user.repository.UserRepository;

import java.util.List;

/**
 * 어드민 대시보드 시각화(118) — 통계 탭 차트용 집계 응답.
 * 도구별 사용량(기존 /admin/stats), 큐 목록(기존 /admin/jobs), 액션 로그(기존 /admin/action-logs)는
 * 이미 있는 엔드포인트로 충분해 여기 포함하지 않는다 — 이 응답은 그 세 개로는 얻을 수 없는
 * 레인 분포·가입경로 분포·큐 적체 게이지·일별 추이만 담는다.
 */
public record AdminDashboardStatsResponse(
        List<LaneDistributionItem> laneDistribution,
        List<ProviderDistributionItem> providerDistribution,
        QueueDepthItem heavyQueue,
        QueueDepthItem videoQueue,
        List<DailyJobCount> dailyJobCounts,
        List<DailySignupCount> dailySignups
) {

    public static AdminDashboardStatsResponse of(
            List<JobRepository.LaneCount> laneCounts,
            List<UserRepository.ProviderCount> providerCounts,
            AdmissionControl.QueueDepth queueDepth,
            List<DailyJobCount> dailyJobCounts,
            List<DailySignupCount> dailySignups
    ) {
        return new AdminDashboardStatsResponse(
                laneCounts.stream().map(LaneDistributionItem::from).toList(),
                providerCounts.stream().map(ProviderDistributionItem::from).toList(),
                new QueueDepthItem(queueDepth.heavyPending(), queueDepth.heavyRunning(), queueDepth.heavyThreshold()),
                new QueueDepthItem(queueDepth.videoPending(), queueDepth.videoRunning(), queueDepth.videoThreshold()),
                dailyJobCounts,
                dailySignups
        );
    }

    public record LaneDistributionItem(String lane, long count) {
        static LaneDistributionItem from(JobRepository.LaneCount c) {
            return new LaneDistributionItem(c.getLane().name(), c.getCount());
        }
    }

    public record ProviderDistributionItem(String provider, long count) {
        static ProviderDistributionItem from(UserRepository.ProviderCount c) {
            return new ProviderDistributionItem(c.getProvider().name(), c.getCount());
        }
    }

    public record QueueDepthItem(int pending, int running, int threshold) {
    }
}
