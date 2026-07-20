import {describe, expect, it} from 'vitest'
import {createEmptyStats, judgeLottoRank, resolvePartialTarget, runLottoBatch, shouldAutoStop} from './lottoSimulator'

describe('judgeLottoRank', () => {
    it('6개 번호가 모두 일치하면 1등이다', () => {
        const target = {numbers: [1, 2, 3, 4, 5, 6], bonus: 7}
        expect(judgeLottoRank([1, 2, 3, 4, 5, 6], target)).toBe(1)
    })

    it('5개 일치 + 보너스 번호까지 일치하면 2등이다', () => {
        const target = {numbers: [1, 2, 3, 4, 5, 6], bonus: 7}
        expect(judgeLottoRank([1, 2, 3, 4, 5, 7], target)).toBe(2)
    })

    it('5개 일치하지만 보너스는 불일치하면 3등이다', () => {
        const target = {numbers: [1, 2, 3, 4, 5, 6], bonus: 7}
        expect(judgeLottoRank([1, 2, 3, 4, 5, 8], target)).toBe(3)
    })

    it('4개 일치하면 4등이다', () => {
        const target = {numbers: [1, 2, 3, 4, 5, 6], bonus: 7}
        expect(judgeLottoRank([1, 2, 3, 4, 8, 9], target)).toBe(4)
    })

    it('3개 일치하면 5등이다', () => {
        const target = {numbers: [1, 2, 3, 4, 5, 6], bonus: 7}
        expect(judgeLottoRank([1, 2, 3, 8, 9, 10], target)).toBe(5)
    })

    it('2개 이하 일치하면 등수가 없다(null)', () => {
        const target = {numbers: [1, 2, 3, 4, 5, 6], bonus: 7}
        expect(judgeLottoRank([1, 2, 8, 9, 10, 11], target)).toBeNull()
    })
})

describe('runLottoBatch', () => {
    it('배치 실행 후 총 게임 수가 이전 통계 + batchSize만큼 증가한다', () => {
        const target = {numbers: [1, 2, 3, 4, 5, 6], bonus: 7}
        const stats = runLottoBatch(target, 100, createEmptyStats())
        expect(stats.totalGames).toBe(100)
    })

    it('배치를 두 번 실행하면 통계가 누적된다(초기화되지 않음)', () => {
        const target = {numbers: [1, 2, 3, 4, 5, 6], bonus: 7}
        const first = runLottoBatch(target, 50, createEmptyStats())
        const second = runLottoBatch(target, 50, first)
        expect(second.totalGames).toBe(100)
    })

    it('등수별 당첨 횟수 합은 항상 총 게임 수 이하다 (당첨 안 한 게임도 있으므로)', () => {
        const target = {numbers: [1, 2, 3, 4, 5, 6], bonus: 7}
        const stats = runLottoBatch(target, 500, createEmptyStats())
        const rankSum = stats.rankCounts[1] + stats.rankCounts[2] + stats.rankCounts[3] + stats.rankCounts[4] + stats.rankCounts[5]
        expect(rankSum).toBeLessThanOrEqual(stats.totalGames)
    })

    it('충분히 많은 게임을 돌리면 5등(3개 일치) 이상이 최소 한 번은 나온다 (확률상 매우 높음)', () => {
        const target = {numbers: [1, 2, 3, 4, 5, 6], bonus: 7}
        const stats = runLottoBatch(target, 20000, createEmptyStats())
        const anyWin = stats.rankCounts[1] + stats.rankCounts[2] + stats.rankCounts[3] + stats.rankCounts[4] + stats.rankCounts[5]
        expect(anyWin).toBeGreaterThan(0)
    })

    it('마지막으로 구매한 티켓 6개를 lastTicket에 담아 반환한다', () => {
        const target = {numbers: [1, 2, 3, 4, 5, 6], bonus: 7}
        const stats = runLottoBatch(target, 10, createEmptyStats())
        expect(stats.lastTicket).toHaveLength(6)
        expect(new Set(stats.lastTicket).size).toBe(6)
        for (const n of stats.lastTicket!) {
            expect(n).toBeGreaterThanOrEqual(1)
            expect(n).toBeLessThanOrEqual(45)
        }
    })
})

describe('shouldAutoStop', () => {
    it('지정한 등수의 당첨 횟수가 목표치에 도달하면 true를 반환한다', () => {
        const stats = {...createEmptyStats(), rankCounts: {1: 0, 2: 0, 3: 0, 4: 0, 5: 3}}
        expect(shouldAutoStop(stats, 5, 3)).toBe(true)
    })

    it('아직 목표치에 못 미치면 false를 반환한다', () => {
        const stats = {...createEmptyStats(), rankCounts: {1: 0, 2: 0, 3: 0, 4: 0, 5: 2}}
        expect(shouldAutoStop(stats, 5, 3)).toBe(false)
    })
})

describe('resolvePartialTarget', () => {
    it('전부 랜덤(null)이면 6개 번호는 서로 다르고 보너스와도 겹치지 않는다', () => {
        for (let trial = 0; trial < 30; trial++) {
            const target = resolvePartialTarget([null, null, null, null, null, null], null)
            expect(target.numbers).toHaveLength(6)
            expect(new Set(target.numbers).size).toBe(6)
            expect(target.numbers).not.toContain(target.bonus)
            for (const n of [...target.numbers, target.bonus]) {
                expect(n).toBeGreaterThanOrEqual(1)
                expect(n).toBeLessThanOrEqual(45)
            }
        }
    })

    it('사용자가 지정한 슬롯은 그대로 유지되고 나머지만 랜덤으로 채워진다', () => {
        const target = resolvePartialTarget([10, null, null, null, null, 20], 30)
        expect(target.numbers[0]).toBe(10)
        expect(target.numbers[5]).toBe(20)
        expect(target.bonus).toBe(30)
    })

    it('지정 슬롯이 많아도(랜덤은 1자리만) 랜덤으로 채워지는 값이 이미 쓰인 번호와 겹치지 않는다', () => {
        for (let trial = 0; trial < 30; trial++) {
            const target = resolvePartialTarget([1, 2, 3, 4, 5, null], 6)
            expect(target.numbers.slice(0, 5)).toEqual([1, 2, 3, 4, 5])
            expect(new Set([...target.numbers, target.bonus]).size).toBe(7)
        }
    })
})
