export function calcBmi(weightKg: number, heightCm: number): number {
    const heightM = heightCm / 100
    return weightKg / (heightM * heightM)
}

export type BmiCategory = '저체중' | '정상' | '과체중' | '비만'

// 아시아-태평양 기준(WHO Asia-Pacific) — 서구 기준(<18.5/25/30)보다 낮은 컷오프를 사용
export function bmiCategory(bmi: number): BmiCategory {
    if (bmi < 18.5) return '저체중'
    if (bmi < 23) return '정상'
    if (bmi < 25) return '과체중'
    return '비만'
}

export type Sex = 'male' | 'female'

// Mifflin-St Jeor 공식
export function calcBmr(weightKg: number, heightCm: number, age: number, sex: Sex): number {
    const base = 10 * weightKg + 6.25 * heightCm - 5 * age
    return sex === 'male' ? base + 5 : base - 161
}

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'veryActive'

const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    veryActive: 1.9,
}

export function calcTdee(bmr: number, activityLevel: ActivityLevel): number {
    return bmr * ACTIVITY_MULTIPLIER[activityLevel]
}
