import {describe, expect, it} from 'vitest'
import {calcIncomeTax, calcLocalIncomeTaxForIncomeTax} from './incomeTaxCalc'

describe('calcIncomeTax (종합소득세 누진세율)', () => {
    it('과세표준 14,000,000원(1구간 상한, 6%, 누진공제 없음) → 840,000원', () => {
        expect(calcIncomeTax(14_000_000)).toBe(840_000)
    })

    it('과세표준 30,000,000원(2구간, 15%, 누진공제 1,260,000원) → 3,240,000원', () => {
        expect(calcIncomeTax(30_000_000)).toBe(3_240_000)
    })

    it('과세표준 100,000,000원(4구간, 35%, 누진공제 15,440,000원) → 19,560,000원', () => {
        expect(calcIncomeTax(100_000_000)).toBe(19_560_000)
    })

    it('과세표준이 0이거나 음수면 0원(방어 처리)', () => {
        expect(calcIncomeTax(0)).toBe(0)
        expect(calcIncomeTax(-1_000_000)).toBe(0)
    })
})

describe('calcLocalIncomeTaxForIncomeTax', () => {
    it('산출세액의 10% — 3,240,000원 → 324,000원', () => {
        expect(calcLocalIncomeTaxForIncomeTax(3_240_000)).toBe(324_000)
    })
})
