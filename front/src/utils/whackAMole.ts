// 두더지잡기: 제한 시간 동안 무작위 구멍에 나타나는 두더지를 최대한 많이 잡는다.
// 한 번에 두더지는 최대 1마리만 활성화되고, 정해진 시간(MOLE_LIFETIME_MS) 안에 못 잡으면
// 점수 없이 사라진다.
export interface WhackAMoleState {
    holes: boolean[]
    activeHole: number | null
    moleRemainingMs: number
    score: number
    timeLeftMs: number
    status: 'playing' | 'over'
}

export const MOLE_LIFETIME_MS = 1200

export function createWhackAMoleState(holeCount = 9, durationMs = 30000): WhackAMoleState {
    return {
        holes: Array(holeCount).fill(false),
        activeHole: null,
        moleRemainingMs: 0,
        score: 0,
        timeLeftMs: durationMs,
        status: 'playing',
    }
}

// 활성화된 두더지가 있는 구멍을 정확히 눌렀을 때만 점수가 오른다 — 빈 구멍을 누르면 아무 일도
// 일어나지 않는다(같은 참조 반환).
export function whack(state: WhackAMoleState, holeIndex: number): WhackAMoleState {
    if (state.status !== 'playing') return state
    if (state.activeHole !== holeIndex) return state
    const holes = [...state.holes]
    holes[holeIndex] = false
    return {...state, holes, activeHole: null, moleRemainingMs: 0, score: state.score + 1}
}

export function tick(state: WhackAMoleState, deltaMs: number, random: () => number = Math.random): WhackAMoleState {
    if (state.status !== 'playing') return state

    const timeLeftMs = Math.max(0, state.timeLeftMs - deltaMs)
    if (timeLeftMs <= 0) return {...state, timeLeftMs: 0, status: 'over'}

    if (state.activeHole !== null) {
        const moleRemainingMs = state.moleRemainingMs - deltaMs
        if (moleRemainingMs <= 0) {
            // 시간 안에 못 잡으면 두더지가 점수 없이 도망친다.
            const holes = [...state.holes]
            holes[state.activeHole] = false
            return {...state, holes, activeHole: null, moleRemainingMs: 0, timeLeftMs}
        }
        return {...state, moleRemainingMs, timeLeftMs}
    }

    const holeIndex = Math.floor(random() * state.holes.length)
    const holes = [...state.holes]
    holes[holeIndex] = true
    return {...state, holes, activeHole: holeIndex, moleRemainingMs: MOLE_LIFETIME_MS, timeLeftMs}
}
