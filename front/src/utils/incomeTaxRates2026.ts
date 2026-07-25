// 2026년 종합소득세 누진세율표 — 매년 확인 필요(값·출처는 docs/data/rate-sources-2026.md 참고).
export interface IncomeTaxBracket {
    upTo: number
    rate: number
    progressiveDeduction: number
}

/** 소득세법 §55 종합소득 기본세율(2023년 개정 이후 구간 유지, 국세청 공식 세율표와 일치). */
export const INCOME_TAX_BRACKETS_2026: IncomeTaxBracket[] = [
    {upTo: 14_000_000, rate: 0.06, progressiveDeduction: 0},
    {upTo: 50_000_000, rate: 0.15, progressiveDeduction: 1_260_000},
    {upTo: 88_000_000, rate: 0.24, progressiveDeduction: 5_760_000},
    {upTo: 150_000_000, rate: 0.35, progressiveDeduction: 15_440_000},
    {upTo: 300_000_000, rate: 0.38, progressiveDeduction: 19_940_000},
    {upTo: 500_000_000, rate: 0.40, progressiveDeduction: 25_940_000},
    {upTo: 1_000_000_000, rate: 0.42, progressiveDeduction: 35_940_000},
    {upTo: Infinity, rate: 0.45, progressiveDeduction: 65_940_000},
]
