import {describe, expect, it} from 'vitest'
import {calcAlcoholGrams, calcBac} from './bacCalc'

describe('calcAlcoholGrams', () => {
    it('소주(17%) 350mL → 순수 알코올 47.6g', () => {
        expect(calcAlcoholGrams(350, 17)).toBeCloseTo(47.6, 6)
    })
})

describe('calcBac (위드마크 공식)', () => {
    it('체중 70kg 남성이 소주 350mL(17%)를 마시고 1시간 경과 → BAC 0.0850%', () => {
        expect(calcBac(70, 350, 17, 'male', 1)).toBeCloseTo(0.085, 6)
    })

    it('같은 조건에서 여성(성별계수 0.55)은 남성보다 BAC가 더 높음(분포비율이 작을수록 농도가 진해짐)', () => {
        const male = calcBac(70, 350, 17, 'male', 1)
        const female = calcBac(70, 350, 17, 'female', 1)
        expect(female).toBeGreaterThan(male)
    })

    it('경과 시간이 충분히 길면 분해되어 0 밑으로 내려가지 않고 0에서 멈춤', () => {
        expect(calcBac(70, 350, 17, 'male', 100)).toBe(0)
    })

    it('체중이 0 이하이면 0을 반환(0으로 나누기 방지)', () => {
        expect(calcBac(0, 350, 17, 'male', 1)).toBe(0)
    })
})
