// Flappy Bird (플랩 버드) 2D Canvas Physics Engine

export const FLAPPY_WIDTH = 480
export const FLAPPY_HEIGHT = 520
export const BIRD_X = 60
export const BIRD_RADIUS = 12
export const PIPE_WIDTH = 52
export const PIPE_GAP = 125

export type FlappyStatus = 'ready' | 'playing' | 'over'

export interface Pipe {
    id: number
    x: number
    gapTop: number
    gapBottom: number
    passed: boolean
}

export interface FlappyState {
    birdY: number
    vy: number
    pipes: Pipe[]
    score: number
    status: FlappyStatus
    elapsedMs: number
    spawnRemainingMs: number
    nextId: number
}

const GRAVITY = 950 // px/s^2
const FLAP_VELOCITY = -330 // px/s
const PIPE_SPEED = 150 // px/s
const SPAWN_INTERVAL_MS = 1600

export function createFlappyState(initialStatus: FlappyStatus = 'ready'): FlappyState {
    return {
        birdY: FLAPPY_HEIGHT / 2,
        vy: 0,
        pipes: [],
        score: 0,
        status: initialStatus,
        elapsedMs: 0,
        spawnRemainingMs: SPAWN_INTERVAL_MS,
        nextId: 1
    }
}

export function startFlappyGame(state: FlappyState): FlappyState {
    return {
        ...state,
        status: 'playing'
    }
}

export function flapBird(state: FlappyState): FlappyState {
    if (state.status !== 'playing') return state
    return {
        ...state,
        vy: FLAP_VELOCITY
    }
}

export function tickFlappy(state: FlappyState, deltaMs: number, random: () => number = Math.random): { nextState: FlappyState; scoreGained: number } {
    if (state.status !== 'playing') return { nextState: state, scoreGained: 0 }

    const dt = Math.min(deltaMs, 50) / 1000
    const elapsedMs = state.elapsedMs + deltaMs

    // 1. 새 중력 물리
    let vy = state.vy + GRAVITY * dt
    let birdY = state.birdY + vy * dt

    // 2. 바닥/천장 충돌 체크
    let isOver = false
    if (birdY - BIRD_RADIUS <= 0 || birdY + BIRD_RADIUS >= FLAPPY_HEIGHT) {
        isOver = true
    }

    // 3. 파이프 이동 및 스폰
    const dx = PIPE_SPEED * dt
    let scoreGained = 0

    const movedPipes = state.pipes.map(p => {
        const nextX = p.x - dx
        let passed = p.passed
        if (!passed && nextX + PIPE_WIDTH < BIRD_X) {
            passed = true
            scoreGained++
        }
        return { ...p, x: nextX, passed }
    })

    const survivedPipes = movedPipes.filter(p => p.x + PIPE_WIDTH > 0)

    let spawnRemainingMs = state.spawnRemainingMs - deltaMs
    let nextId = state.nextId
    let newPipes = [...survivedPipes]

    if (spawnRemainingMs <= 0) {
        const minGapTop = 60
        const maxGapTop = FLAPPY_HEIGHT - 60 - PIPE_GAP
        const gapTop = minGapTop + Math.floor(random() * (maxGapTop - minGapTop))
        const gapBottom = gapTop + PIPE_GAP

        newPipes.push({
            id: nextId,
            x: FLAPPY_WIDTH,
            gapTop,
            gapBottom,
            passed: false
        })
        nextId++
        spawnRemainingMs = SPAWN_INTERVAL_MS
    }

    // 4. 원형-사각 파이프 충돌 체크
    for (const p of newPipes) {
        if (BIRD_X + BIRD_RADIUS > p.x && BIRD_X - BIRD_RADIUS < p.x + PIPE_WIDTH) {
            if (birdY - BIRD_RADIUS < p.gapTop || birdY + BIRD_RADIUS > p.gapBottom) {
                isOver = true
                break
            }
        }
    }

    const score = state.score + scoreGained

    return {
        scoreGained,
        nextState: {
            ...state,
            birdY,
            vy,
            pipes: newPipes,
            score,
            status: isOver ? 'over' : 'playing',
            elapsedMs,
            spawnRemainingMs,
            nextId
        }
    }
}
