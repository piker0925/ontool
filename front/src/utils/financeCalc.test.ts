import {describe, expect, it} from 'vitest'
import {
    conversionRateFromDepositAndRent,
    depositMaturity,
    depositToMonthlyRent,
    equalPaymentSchedule,
    equalPrincipalSchedule,
    legalConversionRateCap,
    monthlyRentToDeposit,
    savingsMaturity,
    supplyToVat,
    totalToSupply,
} from './financeCalc'

describe('equalPaymentSchedule (원리금균등상환)', () => {
    it('1,000,000원 / 연 12% / 2개월 — 매회 상환액 507,512원으로 동일하고 마지막 회차에 잔액이 정확히 0으로 수렴', () => {
        const rows = equalPaymentSchedule(1_000_000, 12, 2)
        expect(rows).toHaveLength(2)
        expect(rows[0]).toEqual({term: 1, payment: 507_512, principalPortion: 497_512, interestPortion: 10_000, balance: 502_488})
        expect(rows[1]).toEqual({term: 2, payment: 507_512, principalPortion: 502_488, interestPortion: 5_025, balance: 0})
    })

    it('10,000,000원 / 연 6% / 12개월 — 12회차 상환액이 전부 860,664원으로 동일(원리금균등 특징)하고 잔액 0 수렴', () => {
        const rows = equalPaymentSchedule(10_000_000, 6, 12)
        expect(rows).toHaveLength(12)
        expect(rows.every(r => r.payment === 860_664)).toBe(true)
        expect(rows[11].balance).toBe(0)
        expect(rows[0]).toEqual({term: 1, payment: 860_664, principalPortion: 810_664, interestPortion: 50_000, balance: 9_189_336})
    })

    it('무이자(연 0%)면 원금을 개월수로 균등 분할한 값과 같음', () => {
        const rows = equalPaymentSchedule(12_000_000, 0, 12)
        expect(rows.every(r => r.payment === 1_000_000 && r.interestPortion === 0)).toBe(true)
        expect(rows[11].balance).toBe(0)
    })
})

describe('equalPrincipalSchedule (원금균등상환)', () => {
    it('10,000,000원 / 연 6% / 12개월 — 원금은 매회 833,333원으로 고정, 이자는 잔액이 줄며 매회 감소, 잔액 0 수렴 (원리금균등과 상환액 다름)', () => {
        const rows = equalPrincipalSchedule(10_000_000, 6, 12)
        expect(rows).toHaveLength(12)
        expect(rows.every(r => r.principalPortion === 833_333)).toBe(true)
        expect(rows[0]).toEqual({term: 1, payment: 883_333, principalPortion: 833_333, interestPortion: 50_000, balance: 9_166_667})
        expect(rows[11]).toEqual({term: 12, payment: 837_500, principalPortion: 833_333, interestPortion: 4_167, balance: 0})
        // 원금균등의 1회차 상환액(883,333)이 원리금균등의 상환액(860,664)과 다름을 확인 — 두 방식이 실제로 다른 결과를 낸다
        const equalPayment = equalPaymentSchedule(10_000_000, 6, 12)
        expect(rows[0].payment).not.toBe(equalPayment[0].payment)
    })
})

describe('depositMaturity (예금 단리 거치식)', () => {
    it('원금 10,000,000원 / 연 6% / 12개월 → 이자 600,000원, 만기수령액 10,600,000원', () => {
        expect(depositMaturity(10_000_000, 6, 12)).toEqual({principalTotal: 10_000_000, interest: 600_000, maturityAmount: 10_600_000})
    })

    it('기간이 절반(6개월)이면 이자도 절반(단리 비례)', () => {
        expect(depositMaturity(10_000_000, 6, 6).interest).toBe(300_000)
    })
})

describe('savingsMaturity (적금 단리 적립식)', () => {
    it('월 1,000,000원 / 연 12% / 12개월 → 원금합계 12,000,000원, 이자 780,000원(n(n+1)/2 공식), 만기수령액 12,780,000원', () => {
        expect(savingsMaturity(1_000_000, 12, 12)).toEqual({principalTotal: 12_000_000, interest: 780_000, maturityAmount: 12_780_000})
    })
})

describe('전월세 전환 라운드트립', () => {
    it('보증금 차액 120,000,000원을 전환율 5%로 월세 전환하면 500,000원, 역산하면 원래 보증금 차액으로 정확히 돌아옴', () => {
        const rent = depositToMonthlyRent(120_000_000, 5)
        expect(rent).toBe(500_000)
        expect(monthlyRentToDeposit(rent, 5)).toBe(120_000_000)
    })
})

describe('conversionRateFromDepositAndRent (전환율 역산)', () => {
    it('보증금 차액 120,000,000원, 월세 500,000원이면 적용된 전환율은 정확히 5%', () => {
        expect(conversionRateFromDepositAndRent(120_000_000, 500_000)).toBe(5)
    })

    it('depositToMonthlyRent로 만든 월세를 다시 역산하면 원래 전환율로 돌아옴(왕복 일관성)', () => {
        const rent = depositToMonthlyRent(80_000_000, 6)
        expect(conversionRateFromDepositAndRent(80_000_000, rent)).toBeCloseTo(6, 5)
    })
})

describe('legalConversionRateCap (법정 상한)', () => {
    it('2025-05-29 공시 기준금리 2.5% + 산정률 2.0%p = 상한 4.5%(한국부동산원 공식 계산기 변동이력과 일치)', () => {
        expect(legalConversionRateCap(2.5, 2.0)).toBe(4.5)
    })
})

describe('부가세 (공급가액 ↔ 부가세포함가)', () => {
    it('공급가액 1,000,000원 → 부가세 100,000원(10%)', () => {
        expect(supplyToVat(1_000_000)).toBe(100_000)
    })

    it('부가세포함가 1,100,000원 → 공급가액 1,000,000원으로 정확히 역산', () => {
        expect(totalToSupply(1_100_000)).toBe(1_000_000)
    })
})
