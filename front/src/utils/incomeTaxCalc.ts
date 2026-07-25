import {INCOME_TAX_BRACKETS_2026} from './incomeTaxRates2026'

/**
 * 종합소득세 산출세액 = 과세표준 × 세율 − 누진공제액(소득세법 §55). 각종 소득공제는 이미 반영된
 * "과세표준" 자체를 입력받는다 — 공제 항목별 세부 계산은 이 함수의 책임이 아니다(간단 추정 스코프).
 */
export function calcIncomeTax(taxableIncome: number): number {
    if (taxableIncome <= 0) return 0
    const bracket = INCOME_TAX_BRACKETS_2026.find(b => taxableIncome <= b.upTo) ?? INCOME_TAX_BRACKETS_2026[INCOME_TAX_BRACKETS_2026.length - 1]
    return Math.max(0, Math.round(taxableIncome * bracket.rate - bracket.progressiveDeduction))
}

/** 지방소득세 = 소득세의 10%(지방세법 일반원칙, 종합소득세 산출세액과 별도로 부과). */
export function calcLocalIncomeTaxForIncomeTax(incomeTax: number): number {
    return Math.round(incomeTax * 0.1)
}
