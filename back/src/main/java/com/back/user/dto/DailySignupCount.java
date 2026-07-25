package com.back.user.dto;

import java.time.LocalDate;

/** 어드민 대시보드(118) — 하루치 신규 가입자 수. 라인 차트용. */
public record DailySignupCount(LocalDate date, long count) {
}
