export const DINO_GROUND_Y = 175
export const DINO_WIDTH = 34
export const DINO_HEIGHT = 40
export const DINO_DUCK_WIDTH = 44
export const DINO_DUCK_HEIGHT = 24
export const CANVAS_WIDTH = 600
export const CANVAS_HEIGHT = 220

export type DinoStatus = 'ready' | 'playing' | 'over'

export interface Obstacle {
    id: number
    x: number
    width: number
    height: number
    type: 'cactus' | 'bird'
    y?: number
}

export interface DinoState {
    dinoY: number // 0 = 지면, >0 = 공중 높이
    vy: number
    isJumping: boolean
    isDucking: boolean
    obstacles: Obstacle[]
    score: number
    speed: number
    status: DinoStatus
    elapsedMs: number
    spawnRemainingMs: number
    nextId: number
}

const GRAVITY = 1200 // px/s^2
const JUMP_VELOCITY = -440 // px/s
const BASE_SPEED = 240 // px/s
const BASE_SPAWN_INTERVAL_MS = 1400

export function createDinoState(initialStatus: DinoStatus = 'ready'): DinoState {
    return {
        dinoY: 0,
        vy: 0,
        isJumping: false,
        isDucking: false,
        obstacles: [],
        score: 0,
        speed: BASE_SPEED,
        status: initialStatus,
        elapsedMs: 0,
        spawnRemainingMs: BASE_SPAWN_INTERVAL_MS,
        nextId: 1
    }
}

export function startDinoGame(state: DinoState): DinoState {
    return {
        ...state,
        status: 'playing',
    }
}

export function jumpDino(state: DinoState): DinoState {
    if (state.status !== 'playing' || state.isJumping) return state
    return {
        ...state,
        isJumping: true,
        isDucking: false,
        vy: JUMP_VELOCITY
    }
}

// 키에서 손을 떼었을 때 상승 중이면 점프 높이를 줄인다 (짧은 점프)
export function releaseJumpDino(state: DinoState): DinoState {
    if (state.status !== 'playing' || !state.isJumping || state.vy >= -150) return state
    return {
        ...state,
        vy: -150
    }
}

export function duckDino(state: DinoState, isDucking: boolean): DinoState {
    if (state.status !== 'playing') return state
    return {
        ...state,
        isDucking: state.isJumping ? false : isDucking
    }
}

export function tickDino(state: DinoState, deltaMs: number, random: () => number = Math.random): { nextState: DinoState; scoreGained: number } {
    if (state.status !== 'playing') return { nextState: state, scoreGained: 0 }

    const dt = Math.min(deltaMs, 50) / 1000
    const elapsedMs = state.elapsedMs + deltaMs
    const speed = BASE_SPEED + Math.floor(elapsedMs / 1000) * 8

    // 1. 점프 물리
    let dinoY = state.dinoY
    let vy = state.vy
    let isJumping = state.isJumping

    if (isJumping) {
        vy += GRAVITY * dt
        dinoY -= vy * dt
        if (dinoY <= 0) {
            dinoY = 0
            vy = 0
            isJumping = false
        }
    }

    // 2. 장애물 이동
    const dx = speed * dt
    const movedObs = state.obstacles.map(o => ({ ...o, x: o.x - dx }))
    const survivedObs = movedObs.filter(o => o.x + o.width > 0)

    // 3. 장애물 스폰
    let spawnRemainingMs = state.spawnRemainingMs - deltaMs
    let nextId = state.nextId
    let newObsList = [...survivedObs]

    if (spawnRemainingMs <= 0) {
        const isBird = random() < 0.28
        const width = isBird ? 32 : 20 + Math.floor(random() * 15)
        const height = isBird ? 22 : 35 + Math.floor(random() * 15)
        // 익룡 높이 3단계: 0(낮음-점프 필수), 26(중간-숙이기 필수!), 60(높음-통과)
        const birdHeights = [0, 26, 60]
        const y = isBird ? birdHeights[Math.floor(random() * birdHeights.length)] : 0

        newObsList.push({
            id: nextId,
            x: CANVAS_WIDTH,
            width,
            height,
            type: isBird ? 'bird' : 'cactus',
            y
        })
        nextId++
        spawnRemainingMs = Math.max(700, BASE_SPAWN_INTERVAL_MS - Math.floor(elapsedMs / 2000) * 100)
    }

    // 4. AABB 충돌 검사
    const currentWidth = state.isDucking ? DINO_DUCK_WIDTH : DINO_WIDTH
    const currentHeight = state.isDucking ? DINO_DUCK_HEIGHT : DINO_HEIGHT
    const dinoBox = {
        left: 40,
        right: 40 + currentWidth - 6,
        bottom: DINO_GROUND_Y - dinoY,
        top: DINO_GROUND_Y - dinoY - currentHeight + 6
    }

    let isColliding = false
    for (const o of newObsList) {
        const obsY = o.y || 0
        const obsBox = {
            left: o.x + 4,
            right: o.x + o.width - 4,
            bottom: DINO_GROUND_Y - obsY,
            top: DINO_GROUND_Y - obsY - o.height + 4
        }

        if (
            dinoBox.right > obsBox.left &&
            dinoBox.left < obsBox.right &&
            dinoBox.bottom > obsBox.top &&
            dinoBox.top < obsBox.bottom
        ) {
            isColliding = true
            break
        }
    }

    const score = state.score + 1

    return {
        scoreGained: 1,
        nextState: {
            ...state,
            dinoY,
            vy,
            isJumping,
            obstacles: newObsList,
            score,
            speed,
            status: isColliding ? 'over' : 'playing',
            elapsedMs,
            spawnRemainingMs,
            nextId
        }
    }
}
