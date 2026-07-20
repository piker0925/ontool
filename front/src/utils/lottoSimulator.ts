import {generateLottoNumbers} from './lotto'

export interface LottoTarget {
    numbers: number[]
    bonus: number
}

export type LottoRank = 1 | 2 | 3 | 4 | 5

/** 실제 로또 6/45 등수 규칙: 1등(6개)·2등(5개+보너스)·3등(5개)·4등(4개)·5등(3개). */
export function judgeLottoRank(ticket: number[], target: LottoTarget): LottoRank | null {
    const matchCount = ticket.filter(n => target.numbers.includes(n)).length
    const bonusMatch = ticket.includes(target.bonus)

    if (matchCount === 6) return 1
    if (matchCount === 5 && bonusMatch) return 2
    if (matchCount === 5) return 3
    if (matchCount === 4) return 4
    if (matchCount === 3) return 5
    return null
}

export interface LottoSimulationStats {
    totalGames: number
    rankCounts: Record<LottoRank, number>
    lastTicket: number[] | null
}

export function createEmptyStats(): LottoSimulationStats {
    return {totalGames: 0, rankCounts: {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}, lastTicket: null}
}

/** batchSize게임을 무작위로 구매해 target과 비교하고, stats에 누적한 새 통계를 반환한다. */
export function runLottoBatch(target: LottoTarget, batchSize: number, stats: LottoSimulationStats): LottoSimulationStats {
    const rankCounts = {...stats.rankCounts}
    let lastTicket = stats.lastTicket
    for (let i = 0; i < batchSize; i++) {
        const ticket = generateLottoNumbers()
        lastTicket = ticket
        const rank = judgeLottoRank(ticket, target)
        if (rank) rankCounts[rank]++
    }
    return {totalGames: stats.totalGames + batchSize, rankCounts, lastTicket}
}

/** 지정한 등수의 당첨 횟수가 목표치(targetCount) 이상이면 정지 신호를 반환한다. */
export function shouldAutoStop(stats: LottoSimulationStats, stopRank: LottoRank, targetCount: number): boolean {
    return stats.rankCounts[stopRank] >= targetCount
}

/**
 * 슬롯별로 지정(숫자)하거나 비워둔(null) 목표를 확정한다.
 * 비워둔 슬롯은 이미 채워진 번호(지정된 슬롯 + 먼저 채워진 랜덤 슬롯)와 겹치지 않게 무작위로 채운다.
 */
export function resolvePartialTarget(numberSlots: (number | null)[], bonusSlot: number | null): LottoTarget {
    const used = new Set<number>()
    numberSlots.forEach(v => {
        if (v !== null) used.add(v)
    })
    if (bonusSlot !== null) used.add(bonusSlot)

    function pickUnused(): number {
        let n: number
        do {
            n = Math.floor(Math.random() * 45) + 1
        } while (used.has(n))
        used.add(n)
        return n
    }

    const numbers = numberSlots.map(v => v ?? pickUnused())
    const bonus = bonusSlot ?? pickUnused()
    return {numbers, bonus}
}
