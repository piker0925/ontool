// Pinball Lottery 2D Physics Engine

export interface PinballPeg {
  x: number
  y: number
  radius: number
}

export interface PinballBall {
  id: number
  name: string
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  color: string
  finished: boolean
  finishTimeMs: number
}

export interface PinballLotteryState {
  pegs: PinballPeg[]
  balls: PinballBall[]
  winningRule: 'first' | 'last'
  status: 'idle' | 'running' | 'finished'
  elapsedMs: number
  winner: PinballBall | null
}

export const PINBALL_WIDTH = 340
export const PINBALL_HEIGHT = 440

export const BALL_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#10b981', '#06b6d4',
  '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#84cc16'
]

export function createPinballState(
    names: string[] = ['참가자 1', '참가자 2', '참가자 3'],
    rule: 'first' | 'last' = 'first'
): PinballLotteryState {
  const pegs: PinballPeg[] = []
  const rows = 6
  const cols = 5

  for (let r = 0; r < rows; r++) {
    const offset = r % 2 === 0 ? 0 : 25
    for (let c = 0; c < cols; c++) {
      pegs.push({
        x: 50 + c * 60 + offset,
        y: 80 + r * 50,
        radius: 6,
      })
    }
  }

  const balls: PinballBall[] = names.map((name, i) => ({
    id: i + 1,
    name,
    x: 60 + (i * 30) % (PINBALL_WIDTH - 120),
    y: 20 + Math.floor(i / 8) * 20,
    vx: (Math.random() - 0.5) * 2,
    vy: 1 + Math.random(),
    radius: 9,
    color: BALL_COLORS[i % BALL_COLORS.length],
    finished: false,
    finishTimeMs: 0,
  }))

  return {
    pegs,
    balls,
    winningRule: rule,
    status: 'idle',
    elapsedMs: 0,
    winner: null,
  }
}

export function startPinball(state: PinballLotteryState): PinballLotteryState {
  return { ...state, status: 'running', elapsedMs: 0, winner: null }
}

export function tickPinball(
    state: PinballLotteryState,
    deltaMs: number
): PinballLotteryState {
  if (state.status !== 'running') return state

  const nextElapsed = state.elapsedMs + deltaMs
  const gravity = 0.15
  let winner = state.winner

  const nextBalls = state.balls.map(b => {
    if (b.finished) return b

    let nx = b.x + b.vx
    let ny = b.y + b.vy
    let nvx = b.vx
    let nvy = b.vy + gravity

    // 핀볼 벽 충돌
    if (nx <= b.radius) { nx = b.radius; nvx = -nvx * 0.7; }
    if (nx >= PINBALL_WIDTH - b.radius) { nx = PINBALL_WIDTH - b.radius; nvx = -nvx * 0.7; }

    // 핀 충돌 판정
    state.pegs.forEach(peg => {
      const dx = nx - peg.x
      const dy = ny - peg.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      const minDist = b.radius + peg.radius

      if (dist < minDist && dist > 0) {
        const nxUnit = dx / dist
        const nyUnit = dy / dist
        const overlap = minDist - dist

        nx += nxUnit * overlap
        ny += nyUnit * overlap

        // 반사 속도
        const dot = nvx * nxUnit + nvy * nyUnit
        nvx = (nvx - 2 * dot * nxUnit) * 0.75 + (Math.random() - 0.5) * 1.5
        nvy = (nvy - 2 * dot * nyUnit) * 0.75 + 0.5
      }
    })

    // 골인 지점 도달 (바닥)
    let finished = false
    let finishTimeMs = b.finishTimeMs
    if (ny >= PINBALL_HEIGHT - b.radius) {
      ny = PINBALL_HEIGHT - b.radius
      finished = true
      finishTimeMs = nextElapsed
      nvx = 0
      nvy = 0
    }

    return { ...b, x: nx, y: ny, vx: nvx, vy: nvy, finished, finishTimeMs }
  })

  // 전원 완료 체크
  const allFinished = nextBalls.every(b => b.finished)
  let status: 'running' | 'finished' = 'running'

  if (allFinished) {
    status = 'finished'
    const sorted = [...nextBalls].sort((a, b) => a.finishTimeMs - b.finishTimeMs)
    winner = state.winningRule === 'first' ? sorted[0] : sorted[sorted.length - 1]
  }

  return {
    ...state,
    balls: nextBalls,
    elapsedMs: nextElapsed,
    status,
    winner,
  }
}
