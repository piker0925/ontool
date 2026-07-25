package com.back.global.util;

/**
 * 어드민 대시보드(118) 일별 집계 조회 범위 남용 방지 — 신뢰 경계 안(관리자)이지만, 실수로 큰
 * 값을 넘겨도 쿼리 범위가 무한정 커지지 않게 상한을 둔다. JobService·UserService가 공유한다.
 */
public final class DashboardDateRange {

    private static final int MAX_DAYS = 90;
    private static final int MIN_DAYS = 1;

    private DashboardDateRange() {}

    public static int clampDays(int days) {
        return Math.min(Math.max(days, MIN_DAYS), MAX_DAYS);
    }
}
