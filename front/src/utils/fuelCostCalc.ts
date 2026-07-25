/** 유류비 = 거리(km) ÷ 연비(km/L) × 유가(원/L). 순수 산술식, 정책 수치 아님. */
export function calcFuelCost(distanceKm: number, fuelEfficiencyKmPerLiter: number, fuelPricePerLiter: number): number {
    if (fuelEfficiencyKmPerLiter <= 0) return 0
    return Math.round((distanceKm / fuelEfficiencyKmPerLiter) * fuelPricePerLiter)
}

/** 사용 리터 수 — 비용과 별개로 화면에 함께 보여주기 위한 보조값. */
export function calcFuelLitersUsed(distanceKm: number, fuelEfficiencyKmPerLiter: number): number {
    if (fuelEfficiencyKmPerLiter <= 0) return 0
    return distanceKm / fuelEfficiencyKmPerLiter
}
