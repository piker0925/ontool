import {describe, expect, it} from 'vitest'
import {petAgeMonthsToHumanYears, petAgeToHumanYears} from './petAgeConvert'

describe('petAgeToHumanYears', () => {
    it('만 1세는 사람 나이 15세(품종 공통 간이 환산식)', () => {
        expect(petAgeToHumanYears('dog', 1)).toBe(15)
        expect(petAgeToHumanYears('cat', 1)).toBe(15)
    })
    it('만 2세는 사람 나이 24세(1세 이후 +9)', () => {
        expect(petAgeToHumanYears('dog', 2)).toBe(24)
        expect(petAgeToHumanYears('cat', 2)).toBe(24)
    })
    it('2세 이후에는 강아지·고양이 환산 배수가 달라짐(강아지 +5/년, 고양이 +4/년)', () => {
        expect(petAgeToHumanYears('dog', 5)).toBe(39) // 24 + 3*5
        expect(petAgeToHumanYears('cat', 5)).toBe(36) // 24 + 3*4
    })
    it('1세 미만은 나이에 비례해 환산(예: 0.5세는 7.5세)', () => {
        expect(petAgeToHumanYears('dog', 0.5)).toBeCloseTo(7.5, 6)
    })
})

describe('petAgeMonthsToHumanYears', () => {
    it('12개월은 년 단위 1세 입력과 동일한 결과(15세)', () => {
        expect(petAgeMonthsToHumanYears('dog', 12)).toBeCloseTo(15, 6)
        expect(petAgeMonthsToHumanYears('cat', 12)).toBeCloseTo(15, 6)
    })
    it('생후 0개월은 사람 나이 0세', () => {
        expect(petAgeMonthsToHumanYears('dog', 0)).toBe(0)
    })
    it('12개월 미만의 어린 개월수도 정밀하게 환산(예: 3개월은 3.75세)', () => {
        expect(petAgeMonthsToHumanYears('dog', 3)).toBeCloseTo(3.75, 6) // 3/12*15
    })
    it('1~11개월 구간 여러 지점에서 정밀도 유지(예: 1개월=1.25세, 7개월=8.75세)', () => {
        expect(petAgeMonthsToHumanYears('dog', 1)).toBeCloseTo(1.25, 6) // 1/12*15
        expect(petAgeMonthsToHumanYears('cat', 7)).toBeCloseTo(8.75, 6) // 7/12*15
    })
    it('큰 개월수(노령묘·노령견)도 자연스럽게 환산(예: 216개월=18세)', () => {
        // 216개월 = 18년 → 24 + 16*5(강아지) / 24 + 16*4(고양이), 년 단위 입력과 동일해야 함
        expect(petAgeMonthsToHumanYears('dog', 216)).toBeCloseTo(petAgeToHumanYears('dog', 18), 6)
        expect(petAgeMonthsToHumanYears('cat', 216)).toBeCloseTo(petAgeToHumanYears('cat', 18), 6)
    })
})
