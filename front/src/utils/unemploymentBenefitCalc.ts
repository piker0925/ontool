import {UNEMPLOYMENT_BENEFIT_DAILY_CAP_2026, UNEMPLOYMENT_BENEFIT_DAILY_FLOOR_2026} from './salaryRates2026'

/** 구직급여 1일 지급액 = 이직 전 평균임금의 60%, 1일 상한/하한액 적용(고용보험법). 값 출처는 docs/data/rate-sources-2026.md. */
export function calcUnemploymentDailyBenefit(averageDailyWage: number): number {
    const raw = averageDailyWage * 0.6
    return Math.round(Math.min(Math.max(raw, UNEMPLOYMENT_BENEFIT_DAILY_FLOOR_2026), UNEMPLOYMENT_BENEFIT_DAILY_CAP_2026))
}

// 고용보험법 별표1(소정급여일수) — [1년미만, 1~3년, 3~5년, 5~10년, 10년이상] 순서.
const PRESCRIBED_DAYS_UNDER_50 = [120, 150, 180, 210, 240]
const PRESCRIBED_DAYS_50_OR_DISABLED = [120, 180, 210, 240, 270]

function insuredPeriodBracket(insuredPeriodMonths: number): number {
    if (insuredPeriodMonths < 12) return 0
    if (insuredPeriodMonths < 36) return 1
    if (insuredPeriodMonths < 60) return 2
    if (insuredPeriodMonths < 120) return 3
    return 4
}

/** 소정급여일수 — 연령(50세 이상 또는 장애인 여부)과 고용보험 가입기간에 따라 결정. */
export function calcUnemploymentBenefitDays(ageAtSeparation: number, insuredPeriodMonths: number, hasDisability: boolean = false): number {
    const table = ageAtSeparation >= 50 || hasDisability ? PRESCRIBED_DAYS_50_OR_DISABLED : PRESCRIBED_DAYS_UNDER_50
    return table[insuredPeriodBracket(insuredPeriodMonths)]
}

export interface UnemploymentBenefitResult {
    dailyBenefit: number
    benefitDays: number
    totalBenefit: number
}

export function calcTotalUnemploymentBenefit(
    averageDailyWage: number,
    ageAtSeparation: number,
    insuredPeriodMonths: number,
    hasDisability: boolean = false,
): UnemploymentBenefitResult {
    const dailyBenefit = calcUnemploymentDailyBenefit(averageDailyWage)
    const benefitDays = calcUnemploymentBenefitDays(ageAtSeparation, insuredPeriodMonths, hasDisability)
    return {dailyBenefit, benefitDays, totalBenefit: dailyBenefit * benefitDays}
}
