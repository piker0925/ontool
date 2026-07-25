import {describe, expect, it} from 'vitest'
import {calcFuelCost, calcFuelLitersUsed} from './fuelCostCalc'

describe('calcFuelCost', () => {
    it('거리 300km / 연비 12km/L / 유가 1,700원 → 25L 사용, 유류비 42,500원', () => {
        expect(calcFuelCost(300, 12, 1700)).toBe(42_500)
        expect(calcFuelLitersUsed(300, 12)).toBe(25)
    })

    it('연비가 2배면 유류비는 절반(반비례 관계 확인)', () => {
        const base = calcFuelCost(300, 12, 1700)
        const doubledEfficiency = calcFuelCost(300, 24, 1700)
        expect(doubledEfficiency).toBe(base / 2)
    })

    it('연비가 0 이하이면 0을 반환(0으로 나누기 방지)', () => {
        expect(calcFuelCost(300, 0, 1700)).toBe(0)
        expect(calcFuelLitersUsed(300, 0)).toBe(0)
    })
})
