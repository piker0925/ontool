export type BiologicalSex = 'male' | 'female'

/** 위드마크 공식(Widmark formula) 성별 계수 — 체내 수분 분포 비율. */
const WIDMARK_DISTRIBUTION_RATIO: Record<BiologicalSex, number> = {
    male: 0.68,
    female: 0.55,
}

/** 시간당 알코올 분해율(%) — 통상 0.008~0.03% 범위 중 평균값으로 널리 쓰이는 0.015를 사용. */
const HOURLY_ELIMINATION_RATE_PERCENT = 0.015

/** 알코올 비중(g/mL) — 순수 에탄올의 밀도. */
const ALCOHOL_DENSITY = 0.8

/** 술의 양(mL)·도수(%)로 섭취한 순수 알코올량(g)을 계산. */
export function calcAlcoholGrams(volumeMl: number, abvPercent: number): number {
    return volumeMl * (abvPercent / 100) * ALCOHOL_DENSITY
}

/**
 * 위드마크 공식으로 추정 혈중알코올농도(%)를 계산.
 * BAC(%) = 알코올량(g) / (체중(kg) × 성별계수) × 0.1 − 시간당분해율 × 경과시간(h)
 * 시간 경과에 따라 0 미만으로 내려가지 않도록 clamp한다.
 */
export function calcBac(weightKg: number, volumeMl: number, abvPercent: number, sex: BiologicalSex, elapsedHours: number): number {
    if (weightKg <= 0) return 0
    const alcoholGrams = calcAlcoholGrams(volumeMl, abvPercent)
    const raw = (alcoholGrams / (weightKg * WIDMARK_DISTRIBUTION_RATIO[sex])) * 0.1 - HOURLY_ELIMINATION_RATE_PERCENT * elapsedHours
    return Math.max(0, raw)
}
