function shuffle<T>(items: T[]): T[] {
    const result = [...items]
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[result[i], result[j]] = [result[j], result[i]]
    }
    return result
}

/** 참가자를 teamCount개 팀으로 무작위 균등 분배한다 (팀당 인원 차이 최대 1명). */
export function splitIntoTeams(participants: string[], teamCount: number): string[][] {
    if (teamCount < 1) throw new Error('팀 수는 1 이상이어야 합니다.')
    const shuffled = shuffle(participants)
    const teams: string[][] = Array.from({length: teamCount}, () => [])
    shuffled.forEach((p, i) => teams[i % teamCount].push(p))
    return teams
}

export interface LadderRung {
    /** 가로줄이 위치한 행 인덱스 (0-based, 위에서부터) */
    row: number
    /** 가로줄이 잇는 왼쪽 세로줄 인덱스 (leftIndex와 leftIndex+1을 연결) */
    leftIndex: number
}

/**
 * 사다리 가로줄을 무작위 생성한다. 같은 행에서 인접한 세로줄 쌍이 겹치지 않도록
 * (leftIndex가 연속하지 않도록) 보장한다 — 겹치면 경로 추적이 모호해진다.
 */
export function generateLadderRungs(participantCount: number, rows: number): LadderRung[] {
    const rungs: LadderRung[] = []
    for (let row = 0; row < rows; row++) {
        let leftIndex = 0
        while (leftIndex < participantCount - 1) {
            if (Math.random() < 0.5) {
                rungs.push({row, leftIndex})
                leftIndex += 2
            } else {
                leftIndex += 1
            }
        }
    }
    return rungs
}

export function groupRungsByRow(rungs: LadderRung[]): Map<number, number[]> {
    const rungsByRow = new Map<number, number[]>()
    for (const r of rungs) {
        const list = rungsByRow.get(r.row) ?? []
        list.push(r.leftIndex)
        rungsByRow.set(r.row, list)
    }
    return rungsByRow
}

export interface LadderCrossing {
    row: number
    fromCol: number
    toCol: number
}

/** 시작 세로줄 하나가 사다리를 타고 내려가며 거치는 교차점들과 최종 도착 세로줄을 계산한다. */
export function traceLadderPath(start: number, rungsByRow: Map<number, number[]>, rows: number): {
    crossings: LadderCrossing[]
    end: number
} {
    let col = start
    const crossings: LadderCrossing[] = []
    for (let row = 0; row < rows; row++) {
        const cols = rungsByRow.get(row) ?? []
        for (const leftIndex of cols) {
            if (col === leftIndex || col === leftIndex + 1) {
                const toCol = col === leftIndex ? leftIndex + 1 : leftIndex
                crossings.push({row, fromCol: col, toCol})
                col = toCol
            }
        }
    }
    return {crossings, end: col}
}

/** 각 시작 세로줄(참가자)이 가로줄들을 타고 내려갔을 때 도착하는 세로줄 인덱스를 계산한다. */
export function traceLadderPaths(participantCount: number, rungs: LadderRung[], rows: number): number[] {
    const rungsByRow = groupRungsByRow(rungs)
    return Array.from({length: participantCount}, (_, start) => traceLadderPath(start, rungsByRow, rows).end)
}

/**
 * 사용자가 입력한 당첨 항목을 도착 슬롯 라벨로 확정한다.
 * 빈 줄을 제거한 개수가 count와 정확히 일치해야 채택하고, 아니면 번호("1번".."N번")로 대체한다.
 */
export function resolveOutcomeLabels(outcomes: string[], count: number): string[] {
    const trimmed = outcomes.map(s => s.trim()).filter(Boolean)
    if (trimmed.length === count) return trimmed
    return Array.from({length: count}, (_, i) => `${i + 1}번`)
}
