// Crossy Road 2D Isometric Vector Engine

export const CROSSY_COLS = 10
export const LANE_HEIGHT = 40
export const CHICKEN_SIZE = 28
export const CANVAS_WIDTH = 560

export type LaneType = 'grass' | 'road' | 'rail'

export interface Vehicle {
    id: number
    x: number
    width: number
    colorStyle?: number // 차량 색상 인덱스 (0: Red, 1: Blue, 2: Yellow, 3: Purple)
}

export interface Lane {
    type: LaneType
    dir: 1 | -1 // 1: right, -1: left
    speed: number
    vehicles: Vehicle[]
    railWarningMs?: number
}

export type CrossyStatus = 'ready' | 'playing' | 'over'

export interface CrossyState {
    chickenX: number
    chickenY: number
    maxReachedY: number
    lanes: Lane[]
    score: number
    status: CrossyStatus
    elapsedMs: number
    nextVehicleId: number
}

function generateLanes(count: number, random: () => number = Math.random): Lane[] {
    const lanes: Lane[] = [
        { type: 'grass', dir: 1, speed: 0, vehicles: [] },
        { type: 'grass', dir: 1, speed: 0, vehicles: [] }
    ]

    for (let i = 2; i < count; i++) {
        const rand = random()
        if (rand < 0.35) {
            lanes.push({ type: 'grass', dir: 1, speed: 0, vehicles: [] })
        } else if (rand < 0.8) {
            const dir = random() < 0.5 ? 1 : -1
            const speed = 130 + Math.floor(random() * 150)
            lanes.push({ type: 'road', dir, speed, vehicles: [] })
        } else {
            lanes.push({ type: 'rail', dir: 1, speed: 480, vehicles: [], railWarningMs: 0 })
        }
    }
    return lanes
}

export function createCrossyState(initialStatus: CrossyStatus = 'ready', random: () => number = Math.random): CrossyState {
    return {
        chickenX: 4,
        chickenY: 0,
        maxReachedY: 0,
        lanes: generateLanes(40, random),
        score: 0,
        status: initialStatus,
        elapsedMs: 0,
        nextVehicleId: 1
    }
}

export function startCrossyGame(state: CrossyState): CrossyState {
    return {
        ...state,
        status: 'playing'
    }
}

export function moveChicken(state: CrossyState, dir: 'up' | 'down' | 'left' | 'right'): CrossyState {
    if (state.status !== 'playing') return state

    let cx = state.chickenX
    let cy = state.chickenY

    if (dir === 'up') cy++
    else if (dir === 'down') cy = Math.max(0, cy - 1)
    else if (dir === 'left') cx = Math.max(0, cx - 1)
    else if (dir === 'right') cx = Math.min(CROSSY_COLS - 1, cx + 1)

    const maxReachedY = Math.max(state.maxReachedY, cy)
    const score = maxReachedY

    let lanes = [...state.lanes]
    if (cy + 20 > lanes.length) {
        lanes = lanes.concat(generateLanes(20))
    }

    return {
        ...state,
        chickenX: cx,
        chickenY: cy,
        maxReachedY,
        lanes,
        score
    }
}

export function tickCrossy(state: CrossyState, deltaMs: number, random: () => number = Math.random): { nextState: CrossyState } {
    if (state.status !== 'playing') return { nextState: state }

    const dt = Math.min(deltaMs, 50) / 1000
    const elapsedMs = state.elapsedMs + deltaMs
    let nextVehicleId = state.nextVehicleId

    const lanes = state.lanes.map((lane) => {
        if (lane.type === 'grass') return lane

        const dir = lane.dir
        const dx = lane.speed * dt * dir
        const movedVehicles = lane.vehicles.map(v => ({ ...v, x: v.x + dx }))
        const survivedVehicles = movedVehicles.filter(v => v.x + v.width > -150 && v.x < 700)

        let vehicles = [...survivedVehicles]
        if (vehicles.length === 0 || Math.abs(vehicles[vehicles.length - 1].x - (dir === 1 ? -100 : 560)) > 180) {
            if (random() < 0.08) {
                const width = lane.type === 'rail' ? 180 : 50 + Math.floor(random() * 35)
                const startX = dir === 1 ? -width : 560
                const colorStyle = Math.floor(random() * 4)
                vehicles.push({ id: nextVehicleId++, x: startX, width, colorStyle })
            }
        }

        // 철길 접근 경고 신호등 제어
        let railWarningMs = lane.railWarningMs || 0
        if (lane.type === 'rail') {
            const hasApproachingTrain = vehicles.some(v => v.x > -200 && v.x < 560)
            if (hasApproachingTrain) {
                railWarningMs += deltaMs
            } else {
                railWarningMs = 0
            }
        }

        return { ...lane, vehicles, railWarningMs }
    })

    // 충돌 체크 (닭 시각적 영역 28px 과 차량 실측 x~x+width 범위 충돌 판정)
    // 억울한 판정이 없도록 HITBOX_INSET을 3px로 축소 및 미세 조정
    const currentLane = lanes[state.chickenY]
    let isColliding = false

    if (currentLane && currentLane.type !== 'grass') {
      const HITBOX_INSET = 3
      const chickenLeft = state.chickenX * 56 + 14 + HITBOX_INSET
      const chickenRight = chickenLeft + CHICKEN_SIZE - HITBOX_INSET * 2

      for (const v of currentLane.vehicles) {
        const vLeft = v.x + HITBOX_INSET
        const vRight = v.x + v.width - HITBOX_INSET
        if (chickenRight > vLeft && chickenLeft < vRight) {
          isColliding = true
          break
        }
      }
    }

    return {
        nextState: {
            ...state,
            lanes,
            status: isColliding ? 'over' : 'playing',
            elapsedMs,
            nextVehicleId
        }
    }
}
