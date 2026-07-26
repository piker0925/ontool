// 기본 팔레트 크기. SimonBoard.vue의 실제 버튼 개수(9)와 일치해야 한다.
// 시퀀스 생성 로직 자체는 이 상수에 하드코딩되어 있지 않다 — colorCount를 파라미터로 받아
// 어떤 버튼 개수(4색 구버전 등)로도 재사용/테스트할 수 있게 파라미터화했다(172).
export const SIMON_COLOR_COUNT = 9

export interface SimonState {
    sequence: number[]
    playerInput: number[]
    round: number
    status: 'playing' | 'over'
    colorCount: number
}

function randomColor(random: () => number, colorCount: number): number {
    return Math.floor(random() * colorCount)
}

export function createSimonGame(random: () => number = Math.random, colorCount: number = SIMON_COLOR_COUNT): SimonState {
    return {sequence: [randomColor(random, colorCount)], playerInput: [], round: 1, status: 'playing', colorCount}
}

// 라운드별 시퀀스 길이 증가 스케줄(172) — 9버튼 확장으로 분기(colorCount)가 4→9로 커지면서
// "매 라운드 정확히 1개씩 늘어나는" 기존 방식은 체감 난이도가 급격히 오른다(경우의 수가
// 라운드마다 4배가 아닌 9배로 늘어나는 셈). colorCount가 SIMON_GROWTH_SLOW_THRESHOLD_COLOR_COUNT를
// 넘는 경우(현재 기본값 9)에는 초반 SIMON_GROWTH_SLOW_ROUNDS 라운드 동안 2라운드에 1개씩만
// 늘려 완만하게 적응시키고, 그 구간을 지나면 다시 원래처럼 매 라운드 1개씩(정상 속도)
// 늘어난다 — 다만 완화 구간에서 덜 늘어난 만큼 이후에도 영구히 더 짧은 시퀀스로 이어진다.
// colorCount가 임계값 이하(구버전 4색 호환)면 완화 없이 항상 round와 길이가 같다(기존 동작 유지).
export const SIMON_GROWTH_SLOW_ROUNDS = 6
export const SIMON_GROWTH_SLOW_THRESHOLD_COLOR_COUNT = 4

export function getSequenceLengthForRound(round: number, colorCount: number): number {
    const clampedRound = Math.max(1, Math.floor(round))
    if (colorCount <= SIMON_GROWTH_SLOW_THRESHOLD_COLOR_COUNT) {
        return clampedRound
    }

    if (clampedRound <= SIMON_GROWTH_SLOW_ROUNDS) {
        return 1 + Math.floor((clampedRound - 1) / 2)
    }

    const lengthAtRampEnd = 1 + Math.floor((SIMON_GROWTH_SLOW_ROUNDS - 1) / 2)
    return lengthAtRampEnd + (clampedRound - SIMON_GROWTH_SLOW_ROUNDS)
}

export function press(state: SimonState, color: number, random: () => number = Math.random): SimonState {
    if (state.status !== 'playing') return state

    const index = state.playerInput.length
    if (state.sequence[index] !== color) {
        return {...state, status: 'over'}
    }

    const playerInput = [...state.playerInput, color]
    if (playerInput.length < state.sequence.length) {
        return {...state, playerInput}
    }

    // 전체 시퀀스를 다 맞혔다 — 다음 라운드로 진행. round는 항상 +1 되지만, 시퀀스가
    // 실제로 길어지는지는 getSequenceLengthForRound의 완화 스케줄을 따른다(172). 새로
    // 추가되는 색도 이 게임이 시작될 때 정한 colorCount(state.colorCount) 범위 안에서만 뽑는다.
    const round = state.round + 1
    const targetLength = getSequenceLengthForRound(round, state.colorCount)
    const sequence = targetLength > state.sequence.length
        ? [...state.sequence, randomColor(random, state.colorCount)]
        : state.sequence
    return {...state, sequence, playerInput: [], round, status: 'playing'}
}

export interface SimonTiming {
    showMs: number
    gapMs: number
}

// 라운드별 재생 속도 스케줄(172) — 처음 접하는 사용자가 첫 시퀀스를 놓치지 않도록 초반
// 라운드는 천천히 보여주고, SIMON_RAMP_ROUNDS 라운드에 걸쳐 선형으로 기본 속도까지 가속한다.
// 9버튼 확장 이후 색을 구분하는 데 더 시간이 걸리는 점을 고려해 시작 속도를 넉넉히 느리게 잡았다.
// "라운드 번호"만 기준으로 삼아 colorCount와는 무관하게 적용된다.
export const SIMON_BASE_SHOW_MS = 500
export const SIMON_BASE_GAP_MS = 200
const SIMON_START_SHOW_MS = 1000
const SIMON_START_GAP_MS = 450
const SIMON_RAMP_ROUNDS = 6

export function getSimonTiming(round: number): SimonTiming {
    const clampedRound = Math.max(1, Math.floor(round))
    if (clampedRound >= SIMON_RAMP_ROUNDS) {
        return {showMs: SIMON_BASE_SHOW_MS, gapMs: SIMON_BASE_GAP_MS}
    }

    const t = (clampedRound - 1) / (SIMON_RAMP_ROUNDS - 1)
    return {
        showMs: Math.round(SIMON_START_SHOW_MS + (SIMON_BASE_SHOW_MS - SIMON_START_SHOW_MS) * t),
        gapMs: Math.round(SIMON_START_GAP_MS + (SIMON_BASE_GAP_MS - SIMON_START_GAP_MS) * t),
    }
}
