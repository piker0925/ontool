import {describe, expect, it} from 'vitest'
import {calcTotalUnemploymentBenefit, calcUnemploymentBenefitDays, calcUnemploymentDailyBenefit} from './unemploymentBenefitCalc'

describe('calcUnemploymentDailyBenefit', () => {
    it('평균임금의 60%가 하한액(66,048원)보다 낮으면 하한액으로 올림', () => {
        expect(calcUnemploymentDailyBenefit(100_000)).toBe(66_048)
    })

    it('평균임금의 60%가 상한액(68,100원)보다 높으면 상한액으로 낮춤', () => {
        expect(calcUnemploymentDailyBenefit(200_000)).toBe(68_100)
    })

    it('평균임금의 60%가 하한과 상한 사이면 그대로 사용(1일 평균임금 112,000원 → 60% = 67,200원)', () => {
        expect(calcUnemploymentDailyBenefit(112_000)).toBe(67_200)
    })
})

describe('calcUnemploymentBenefitDays (소정급여일수, 고용보험법 별표1)', () => {
    it('50세 미만 · 가입기간 25개월(1~3년 구간) → 150일', () => {
        expect(calcUnemploymentBenefitDays(30, 25)).toBe(150)
    })

    it('50세 이상 · 가입기간 6개월(1년 미만 구간)이라도 고령자 표를 써서 120일(50세 미만과 이 구간은 동일)', () => {
        expect(calcUnemploymentBenefitDays(55, 6)).toBe(120)
    })

    it('50세 이상 · 가입기간 40개월(3~5년 구간) → 고령자 표 210일 (50세 미만 표였다면 180일이라 서로 다름)', () => {
        expect(calcUnemploymentBenefitDays(55, 40)).toBe(210)
        expect(calcUnemploymentBenefitDays(30, 40)).toBe(180)
    })

    it('50세 미만 · 가입기간 130개월(10년 이상 구간) → 최대 240일', () => {
        expect(calcUnemploymentBenefitDays(30, 130)).toBe(240)
    })

    it('장애인은 50세 미만이라도 고령자 표 적용', () => {
        expect(calcUnemploymentBenefitDays(30, 40, true)).toBe(210)
    })
})

describe('calcTotalUnemploymentBenefit', () => {
    it('평균임금 112,000원 · 30세 · 가입 25개월 → 일액 67,200원 × 150일 = 10,080,000원', () => {
        expect(calcTotalUnemploymentBenefit(112_000, 30, 25)).toEqual({dailyBenefit: 67_200, benefitDays: 150, totalBenefit: 10_080_000})
    })
})
