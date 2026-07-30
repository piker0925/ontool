// Dev Code Rain Typing: 코드/CS 용어가 위에서 아래로 떨어지고, 정확히 타이핑해서 제출하면
// 그 단어가 사라지고 점수가 오른다. 바닥(BOARD_HEIGHT)에 닿은 단어는 놓친 것으로 처리돼
// 사라지고 라이프가 하나 줄며, 라이프가 0이 되면 게임 오버.
export type CodeRainStatus = 'ready' | 'playing' | 'over'

export interface FallingWord {
    id: number
    text: string
    x: number
    y: number
}

export interface CodeRainState {
    words: FallingWord[]
    pack: string[]
    score: number
    lives: number
    status: CodeRainStatus
    elapsedMs: number
    spawnRemainingMs: number
    nextId: number
    combo: number
    maxCombo: number
    timeLeftSec: number
}

export const BOARD_HEIGHT = 560
export const DEFAULT_TIME_LIMIT_SEC = 60

// 스폰 x 위치가 몰릴 수 있는 범위(가장자리 잘림 방지용 여백) — 퍼센트 좌표라 보드 폭과 무관하게 반응형이다.
const SPAWN_X_MIN_PERCENT = 8
const SPAWN_X_MAX_PERCENT = 92

const BASE_SPEED_PX_PER_SEC = 40
const BASE_SPAWN_INTERVAL_MS = 1800
const MIN_SPAWN_INTERVAL_MS = 500
const SPEED_ACCEL_PER_SEC = 0.02

function speedMultiplier(elapsedMs: number): number {
    return 1 + (elapsedMs / 1000) * SPEED_ACCEL_PER_SEC
}

export function createCodeRainState(pack: string[], lives = 5, initialStatus: CodeRainStatus = 'ready', timeLimitSec = DEFAULT_TIME_LIMIT_SEC): CodeRainState {
    return {
        words: [],
        pack,
        score: 0,
        lives,
        status: initialStatus,
        elapsedMs: 0,
        spawnRemainingMs: BASE_SPAWN_INTERVAL_MS,
        nextId: 0,
        combo: 0,
        maxCombo: 0,
        timeLeftSec: timeLimitSec,
    }
}

export function startGameState(state: CodeRainState): CodeRainState {
    return {
        ...state,
        status: 'playing',
    }
}

export function tick(state: CodeRainState, deltaMs: number, random: () => number = Math.random): CodeRainState {
    if (state.status !== 'playing') return state

    const elapsedMs = state.elapsedMs + deltaMs
    const timeLeftSec = Math.max(0, DEFAULT_TIME_LIMIT_SEC - Math.floor(elapsedMs / 1000))
    const speed = speedMultiplier(elapsedMs)
    const dy = (BASE_SPEED_PX_PER_SEC * speed * deltaMs) / 1000

    const moved = state.words.map(w => ({...w, y: w.y + dy}))
    const survived = moved.filter(w => w.y < BOARD_HEIGHT)
    const missed = moved.length - survived.length
    const lives = state.lives - missed
    const combo = missed > 0 ? 0 : state.combo

    let words = survived
    let spawnRemainingMs = state.spawnRemainingMs - deltaMs
    let nextId = state.nextId
    if (spawnRemainingMs <= 0 && state.pack.length > 0) {
        const text = state.pack[Math.floor(random() * state.pack.length)]
        const x = SPAWN_X_MIN_PERCENT + random() * (SPAWN_X_MAX_PERCENT - SPAWN_X_MIN_PERCENT)
        words = [...words, {id: nextId, text, x, y: 0}]
        nextId += 1
        spawnRemainingMs = Math.max(MIN_SPAWN_INTERVAL_MS, BASE_SPAWN_INTERVAL_MS / speed)
    }

    const status: CodeRainStatus = (lives <= 0 || timeLeftSec <= 0) ? 'over' : 'playing'

    return {...state, words, lives, status, elapsedMs, spawnRemainingMs, nextId, combo, timeLeftSec}
}

// 대소문자 구별 없이 입력된 단어와 일치하는지 판정하고, 콤보 상승을 처리한다.
export function submitWord(state: CodeRainState, input: string): CodeRainState {
    if (state.status !== 'playing') return state
    const trimmed = input.trim().toLowerCase()
    if (!trimmed) return state

    const index = state.words.findIndex(w => w.text.toLowerCase() === trimmed)
    if (index === -1) return state

    const words = [...state.words.slice(0, index), ...state.words.slice(index + 1)]
    const newCombo = state.combo + 1
    const maxCombo = Math.max(state.maxCombo, newCombo)
    return {...state, words, score: state.score + 1, combo: newCombo, maxCombo}
}

