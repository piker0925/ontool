// Yacht Dice Engine

export type YachtCategory =
    | 'aces' | 'twos' | 'threes' | 'fours' | 'fives' | 'sixes'
    | 'choice' | 'fourOfAKind' | 'fullHouse' | 'smallStraight' | 'largeStraight' | 'yacht'

export interface YachtState {
    dice: number[] // 5개 주사위 (1~6)
    kept: boolean[] // 5개 주사위 고정 여부
    rerollsLeft: number // 0~2
    scores: Partial<Record<YachtCategory, number>>
    totalScore: number
    status: 'playing' | 'over'
}

export function roll5Dice(random: () => number = Math.random): number[] {
    return Array.from({ length: 5 }, () => 1 + Math.floor(random() * 6))
}

export function createYachtState(): YachtState {
    return {
        dice: [],
        kept: [false, false, false, false, false],
        rerollsLeft: 3,
        scores: {},
        totalScore: 0,
        status: 'playing'
    }
}

export function toggleKeepDice(state: YachtState, index: number): YachtState {
    if (state.status !== 'playing' || index < 0 || index >= 5 || state.dice.length < 5) return state
    const kept = [...state.kept]
    kept[index] = !kept[index]
    return { ...state, kept }
}

export function rerollDice(state: YachtState, random: () => number = Math.random): YachtState {
    if (state.status !== 'playing' || state.rerollsLeft <= 0) return state
    const dice = state.dice.length === 0
        ? roll5Dice(random)
        : state.dice.map((d, i) => (state.kept[i] ? d : 1 + Math.floor(random() * 6)))
    return {
        ...state,
        dice,
        rerollsLeft: state.rerollsLeft - 1
    }
}

export function calculateCategoryScore(cat: YachtCategory, dice: number[]): number {
    if (!dice || dice.length < 5) return 0
    const counts = [0, 0, 0, 0, 0, 0, 0]
    let sum = 0
    for (const d of dice) {
        counts[d]++
        sum += d
    }

    switch (cat) {
        case 'aces': return counts[1] * 1
        case 'twos': return counts[2] * 2
        case 'threes': return counts[3] * 3
        case 'fours': return counts[4] * 4
        case 'fives': return counts[5] * 5
        case 'sixes': return counts[6] * 6
        case 'choice': return sum
        case 'fourOfAKind': return counts.some(c => c >= 4) ? sum : 0
        case 'fullHouse': {
            const has3 = counts.some(c => c === 3)
            const has2 = counts.some(c => c === 2)
            const has5 = counts.some(c => c === 5)
            return (has3 && has2) || has5 ? sum : 0
        }
        case 'smallStraight': {
            const str = Object.keys(counts).filter(k => counts[Number(k)] > 0).join('')
            return str.includes('1234') || str.includes('2345') || str.includes('3456') ? 15 : 0
        }
        case 'largeStraight': {
            const str = Object.keys(counts).filter(k => counts[Number(k)] > 0).join('')
            return str.includes('12345') || str.includes('23456') ? 30 : 0
        }
        case 'yacht': return counts.some(c => c === 5) ? 50 : 0
    }
}

export function recordScore(state: YachtState, cat: YachtCategory): YachtState {
    if (state.status !== 'playing' || state.scores[cat] !== undefined || state.dice.length < 5) return state

    const score = calculateCategoryScore(cat, state.dice)
    const scores = { ...state.scores, [cat]: score }
    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0)

    const isOver = Object.keys(scores).length === 12

    return {
        dice: [],
        kept: [false, false, false, false, false],
        rerollsLeft: 3,
        scores,
        totalScore,
        status: isOver ? 'over' : 'playing'
    }
}
