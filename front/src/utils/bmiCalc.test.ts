import {describe, expect, it} from 'vitest'
import {bmiCategory, calcBmi, calcBmr, calcTdee} from './bmiCalc'

describe('calcBmi', () => {
    it('체중 70kg, 신장 175cm → BMI 22.857...(체중/키(m)^2, 손계산값과 일치)', () => {
        expect(calcBmi(70, 175)).toBeCloseTo(22.857142857, 6)
    })
})

describe('bmiCategory (아시아-태평양 기준)', () => {
    it('18.5 미만은 저체중', () => {
        expect(bmiCategory(18.4)).toBe('저체중')
    })
    it('18.5~22.9는 정상', () => {
        expect(bmiCategory(22.857142857)).toBe('정상')
    })
    it('23~24.9는 과체중', () => {
        expect(bmiCategory(23)).toBe('과체중')
    })
    it('25 이상은 비만', () => {
        expect(bmiCategory(25)).toBe('비만')
    })
})

describe('calcBmr (Mifflin-St Jeor)', () => {
    it('남성, 70kg·175cm·30세 → 1648.75kcal(공식 손계산값)', () => {
        expect(calcBmr(70, 175, 30, 'male')).toBeCloseTo(1648.75, 6)
    })
    it('여성, 70kg·175cm·30세 → 1482.75kcal(남성 공식과 상수만 다름, 실제로 다른 값 나옴)', () => {
        const female = calcBmr(70, 175, 30, 'female')
        expect(female).toBeCloseTo(1482.75, 6)
        expect(female).not.toBeCloseTo(calcBmr(70, 175, 30, 'male'), 1)
    })
})

describe('calcTdee', () => {
    it('BMR 1648.75, 활동량 sedentary(x1.2) → 1978.5kcal', () => {
        expect(calcTdee(1648.75, 'sedentary')).toBeCloseTo(1978.5, 6)
    })
})
