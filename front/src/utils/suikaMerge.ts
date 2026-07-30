// Suika Merge 2D Heavy Physics & Fruit Evolution Engine

export interface FruitDef {
    level: number
    name: string
    radius: number
    color: string
    score: number
}

export const CONTAINER_WIDTH = 420
export const CONTAINER_HEIGHT = 560
export const DEADLINE_Y = 70

export const FRUITS: FruitDef[] = [
    { level: 0, name: '체리', radius: 16, color: '#ef4444', score: 2 },
    { level: 1, name: '딸기', radius: 24, color: '#f43f5e', score: 4 },
    { level: 2, name: '포도', radius: 32, color: '#8b5cf6', score: 8 },
    { level: 3, name: '한라봉', radius: 40, color: '#f97316', score: 16 },
    { level: 4, name: '귤', radius: 48, color: '#eab308', score: 32 },
    { level: 5, name: '사과', radius: 58, color: '#dc2626', score: 64 },
    { level: 6, name: '배', radius: 68, color: '#a3e635', score: 128 },
    { level: 7, name: '복숭아', radius: 78, color: '#fda4af', score: 256 },
    { level: 8, name: '파인애플', radius: 88, color: '#ca8a04', score: 512 },
    { level: 9, name: '멜론', radius: 100, color: '#22c55e', score: 1024 },
    { level: 10, name: '수박', radius: 115, color: '#15803d', score: 2048 }
]

export interface ActiveFruit {
    id: number
    level: number
    x: number
    y: number
    vx: number
    vy: number
    radius: number
}

export type SuikaStatus = 'ready' | 'playing' | 'over'

export interface SuikaState {
    fruits: ActiveFruit[]
    dropX: number
    currentLevel: number
    nextLevel: number
    score: number
    status: SuikaStatus
    overTimerMs: number
    dropCooldownMs: number
    nextId: number
}

export function createSuikaState(initialStatus: SuikaStatus = 'ready', random: () => number = Math.random): SuikaState {
    const currentLevel = Math.floor(random() * 4) // 0~3 레벨 과일만 처음에 등장
    const nextLevel = Math.floor(random() * 4)
    return {
        fruits: [],
        dropX: CONTAINER_WIDTH / 2,
        currentLevel,
        nextLevel,
        score: 0,
        status: initialStatus,
        overTimerMs: 0,
        dropCooldownMs: 0,
        nextId: 1
    }
}

export function startSuikaGame(state: SuikaState): SuikaState {
    return {
        ...state,
        status: 'playing'
    }
}

export function mergeFruits(fruits: ActiveFruit[], f1: ActiveFruit, f2: ActiveFruit, nextId: number): { remainingFruits: ActiveFruit[]; mergedFruit: ActiveFruit; scoreGained: number } {
    const newLevel = Math.min(10, f1.level + 1)
    const def = FRUITS[newLevel]
    const midX = (f1.x + f2.x) / 2
    const midY = (f1.y + f2.y) / 2

    const mergedFruit: ActiveFruit = {
        id: nextId,
        level: newLevel,
        x: midX,
        y: midY,
        vx: 0,
        vy: 0,
        radius: def.radius
    }

    const remainingFruits = fruits.filter(f => f.id !== f1.id && f.id !== f2.id)
    remainingFruits.push(mergedFruit)

    return {
        remainingFruits,
        mergedFruit,
        scoreGained: def.score
    }
}

export function dropFruit(state: SuikaState, random: () => number = Math.random): SuikaState {
    if (state.status !== 'playing' || state.dropCooldownMs > 0) return state

    const def = FRUITS[state.currentLevel]
    const clampedX = Math.max(def.radius, Math.min(CONTAINER_WIDTH - def.radius, state.dropX))

    const newFruit: ActiveFruit = {
        id: state.nextId,
        level: state.currentLevel,
        x: clampedX,
        y: def.radius + 15,
        vx: 0,
        vy: 200, // 중량감 묵직한 초기 낙하 속도
        radius: def.radius
    }

    const nextLevel = Math.floor(random() * 4)

    return {
        ...state,
        fruits: [...state.fruits, newFruit],
        currentLevel: state.nextLevel,
        nextLevel,
        dropCooldownMs: 500, // 500ms 연타 방지 쿨다운
        nextId: state.nextId + 1
    }
}

const GRAVITY = 2200 // px/s^2 (묵직한 현실 물리 중력)
const RESTITUTION = 0.15 // 바운스 반발력 감소 (묵직한 억제)

export function stepPhysics(state: SuikaState, deltaMs: number, random: () => number = Math.random): SuikaState {
    if (state.status !== 'playing') return state

    const dropCooldownMs = Math.max(0, state.dropCooldownMs - deltaMs)
    const dt = Math.min(deltaMs, 50) / 1000
    const SUB_STEPS = 6
    const subDt = dt / SUB_STEPS

    let fruits = state.fruits.map(f => ({...f}))
    let score = state.score
    let nextId = state.nextId

    for (let step = 0; step < SUB_STEPS; step++) {
        // 1. 중력 및 위치 물리 적분
        for (const f of fruits) {
            f.vy += GRAVITY * subDt
            f.x += f.vx * subDt
            f.y += f.vy * subDt

            // 벽/바닥 충돌 반발 & 바닥 마찰 저항
            if (f.x - f.radius < 0) {
                f.x = f.radius
                f.vx = -f.vx * RESTITUTION
            } else if (f.x + f.radius > CONTAINER_WIDTH) {
                f.x = CONTAINER_WIDTH - f.radius
                f.vx = -f.vx * RESTITUTION
            }

            if (f.y + f.radius > CONTAINER_HEIGHT) {
                f.y = CONTAINER_HEIGHT - f.radius
                f.vy = -f.vy * RESTITUTION
                f.vx *= 0.88 // 묵직한 마찰 저항
            }
        }

        // 2. 질량 비율 기반 2D 구형 충돌 & 합성
        let mergedInStep = false
        for (let i = 0; i < fruits.length; i++) {
            if (mergedInStep) break
            for (let j = i + 1; j < fruits.length; j++) {
                const f1 = fruits[i]
                const f2 = fruits[j]

                const dx = f2.x - f1.x
                const dy = f2.y - f1.y
                const distSq = dx * dx + dy * dy
                const minDist = f1.radius + f2.radius

                if (distSq < minDist * minDist) {
                    const dist = Math.sqrt(distSq) || 0.001
                    // 같은 레벨이면 합성!
                    if (f1.level === f2.level) {
                        const res = mergeFruits(fruits, f1, f2, nextId)
                        fruits = res.remainingFruits
                        score += res.scoreGained
                        nextId++
                        mergedInStep = true
                        break
                    } else {
                        // 질량 기반 밀쳐내기 (Impulse separation by mass ratio)
                        const overlap = minDist - dist
                        const nx = dx / dist
                        const ny = dy / dist

                        const m1 = f1.radius * f1.radius
                        const m2 = f2.radius * f2.radius
                        const totalM = m1 + m2

                        const ratio1 = m2 / totalM
                        const ratio2 = m1 / totalM

                        f1.x -= nx * overlap * ratio1
                        f1.y -= ny * overlap * ratio1
                        f2.x += nx * overlap * ratio2
                        f2.y += ny * overlap * ratio2

                        const damping = 0.3
                        f1.vx -= nx * damping
                        f1.vy -= ny * damping
                        f2.vx += nx * damping
                        f2.vy += ny * damping
                    }
                }
            }
        }
    }

    // 3. LIMIT 마지노선(DEADLINE_Y) 영구 침범 검사 (정지 및 미세 속도 조건)
    const overLineExist = fruits.some(f => f.y - f.radius < DEADLINE_Y && Math.abs(f.vy) < 40)
    let overTimerMs = state.overTimerMs
    let status: SuikaStatus = state.status

    if (overLineExist) {
        overTimerMs += deltaMs
        if (overTimerMs > 1800) { // 1.8초 동안 넘쳐나면 게임오버!
            status = 'over'
        }
    } else {
        overTimerMs = 0
    }

    return {
        ...state,
        fruits,
        score,
        nextId,
        overTimerMs,
        dropCooldownMs,
        status
    }
}
