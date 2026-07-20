import {describe, expect, it} from 'vitest'
import {petAgeToHumanYears} from './petAgeConvert'

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
