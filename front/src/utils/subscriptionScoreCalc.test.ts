import {describe, expect, it} from 'vitest'
import {calcAccountPeriodScore, calcDependentsScore, calcNoHomeownershipScore, calcSubscriptionScore} from './subscriptionScoreCalc'

describe('calcNoHomeownershipScore (무주택기간)', () => {
    it('1년 미만은 기본 2점', () => {
        expect(calcNoHomeownershipScore(0.5)).toBe(2)
    })
    it('1년마다 2점씩 가산 — 5년이면 12점', () => {
        expect(calcNoHomeownershipScore(5)).toBe(12)
    })
    it('15년 이상은 만점 32점에서 더 오르지 않음', () => {
        expect(calcNoHomeownershipScore(15)).toBe(32)
        expect(calcNoHomeownershipScore(30)).toBe(32)
    })
})

describe('calcDependentsScore (부양가족수)', () => {
    it('0명이면 기본 5점', () => {
        expect(calcDependentsScore(0)).toBe(5)
    })
    it('1명당 5점씩 가산 — 3명이면 20점', () => {
        expect(calcDependentsScore(3)).toBe(20)
    })
    it('6명 이상은 만점 35점에서 더 오르지 않음', () => {
        expect(calcDependentsScore(6)).toBe(35)
        expect(calcDependentsScore(10)).toBe(35)
    })
})

describe('calcAccountPeriodScore (청약통장 가입기간)', () => {
    it('6개월 미만은 1점', () => {
        expect(calcAccountPeriodScore(3)).toBe(1)
    })
    it('6개월~1년 미만은 2점', () => {
        expect(calcAccountPeriodScore(8)).toBe(2)
    })
    it('1년 이상은 1년마다 1점씩 가산 — 5년이면 7점', () => {
        expect(calcAccountPeriodScore(60)).toBe(7)
    })
    it('15년 이상은 만점 17점에서 더 오르지 않음', () => {
        expect(calcAccountPeriodScore(180)).toBe(17)
        expect(calcAccountPeriodScore(300)).toBe(17)
    })
})

describe('calcSubscriptionScore (합산)', () => {
    it('세 항목 모두 만점이면 합계는 알려진 청약가점제 만점 84점', () => {
        const result = calcSubscriptionScore(15, 6, 180)
        expect(result).toEqual({noHomeownershipScore: 32, dependentsScore: 35, accountPeriodScore: 17, totalScore: 84})
    })

    it('중간값 조합 — 무주택 5년(12점) · 부양가족 3명(20점) · 가입 5년(7점) = 39점', () => {
        expect(calcSubscriptionScore(5, 3, 60).totalScore).toBe(39)
    })
})
