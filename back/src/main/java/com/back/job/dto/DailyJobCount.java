package com.back.job.dto;

import java.time.LocalDate;

/**
 * 어드민 대시보드(118) — 하루치 Job 성공/실패 집계. 라인 차트(성공/실패 스택)용.
 * PENDING/RUNNING은 아직 결과가 확정되지 않아 집계에 포함하지 않는다.
 */
public record DailyJobCount(LocalDate date, long doneCount, long failCount) {
}
