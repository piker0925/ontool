// 2026년 급여·4대보험 공식 요율/기준값 — 매년 갱신 필요.
// 각 값의 근거·확인일·신뢰도는 docs/rate-sources-2026.md 참고 (이 파일은 값만, 상세 출처는 그 문서가 단일 출처).

/** 2026년 최저임금(시급). 고용노동부 확정 고시. */
export const MINIMUM_WAGE_2026_HOURLY = 10320

/** 2026년 최저임금 월 환산액(주 40시간, 월 209시간 기준). */
export const MINIMUM_WAGE_2026_MONTHLY_209H = 2156880

/** 국민연금 근로자 부담률. 2025년까지 4.5% → 2026-01-01부터 연금개혁법에 따라 매년 0.5%p씩 인상 시작. */
export const NATIONAL_PENSION_EMPLOYEE_RATE = 0.0475

/**
 * 국민연금 기준소득월액 상/하한액 — 2026-07~2027-06 적용분(현재 활성 구간).
 * 매년 7월 A값 변동률 반영해 갱신됨. 2026-01~06월 적용분(하한 40만원/상한 637만원)은
 * 이미 지난 구간이라 상수를 두지 않음 — 필요해지면 docs/rate-sources-2026.md에서 값 확인.
 */
export const NATIONAL_PENSION_INCOME_FLOOR_2026H2 = 410000
export const NATIONAL_PENSION_INCOME_CAP_2026H2 = 6590000

/** 건강보험 근로자 부담률(전체 7.19%의 절반). 보건복지부 2025-08-28 건강보험정책심의위원회 의결. */
export const HEALTH_INSURANCE_EMPLOYEE_RATE = 0.03595

/** 장기요양보험료율(건강보험료에 대한 비율). 보건복지부 2025-11-04 장기요양위원회 의결. */
export const LONG_TERM_CARE_RATE_OF_HEALTH_INSURANCE = 0.1314

/**
 * 고용보험(실업급여) 근로자 부담률. 2022-07 1.6%→1.8% 인상 이후 2024·2025·2026년 3년 연속 동결.
 * 신뢰도 낮음 표시: 고용노동부 고시 원문 직접 확인은 못 했고 다수 2차 출처(세무·인사 정보 사이트) 일치로 확인.
 */
export const EMPLOYMENT_INSURANCE_EMPLOYEE_RATE = 0.009

/** 구직급여(실업급여) 1일 상한액 — 2026-01-01 이직자부터 적용(2019년 이후 6년 만의 인상, 66,000원→68,100원). */
export const UNEMPLOYMENT_BENEFIT_DAILY_CAP_2026 = 68_100

/** 구직급여 1일 하한액 = 이직 당시 최저시급(10,320원) × 80% × 8시간. 별도 고시 원문은 못 찾았고 2차 출처 다수 일치로 확인. */
export const UNEMPLOYMENT_BENEFIT_DAILY_FLOOR_2026 = 66_048
