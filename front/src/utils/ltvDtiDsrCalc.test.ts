import {describe, expect, it} from 'vitest'
import {calcDsr, calcDti, calcLtv} from './ltvDtiDsrCalc'

describe('calcLtv', () => {
    it('대출금 350,000,000원 / 담보가치 500,000,000원 → LTV 70%', () => {
        expect(calcLtv(350_000_000, 500_000_000)).toBe(70)
    })
    it('담보가치가 0 이하면 0을 반환(0으로 나누기 방지)', () => {
        expect(calcLtv(100, 0)).toBe(0)
    })
})

describe('calcDti', () => {
    it('주담대 연원리금 20,000,000원 + 기타부채 연이자 2,000,000원 / 연소득 55,000,000원 → DTI 40%', () => {
        expect(calcDti(20_000_000, 2_000_000, 55_000_000)).toBeCloseTo(40, 6)
    })
    it('연소득이 0 이하면 0을 반환(0으로 나누기 방지)', () => {
        expect(calcDti(1000, 1000, 0)).toBe(0)
    })
})

describe('calcDsr', () => {
    it('총부채 연원리금상환액 22,000,000원 / 연소득 55,000,000원 → DSR 40%', () => {
        expect(calcDsr(22_000_000, 55_000_000)).toBe(40)
    })
    it('DTI와 DSR은 분자 구성이 달라 같은 소득이라도 서로 다른 결과를 낼 수 있음', () => {
        const dti = calcDti(20_000_000, 2_000_000, 55_000_000)
        const dsr = calcDsr(25_000_000, 55_000_000)
        expect(dti).not.toBe(dsr)
    })
    it('연소득이 0 이하면 0을 반환(0으로 나누기 방지)', () => {
        expect(calcDsr(1000, 0)).toBe(0)
    })
})
