// Paper.io Style 2D Grid Territory Capture Engine with Dynamic AI Personalities

export const TURF_GRID_SIZE = 30

export type Dir = 'up' | 'down' | 'left' | 'right'
export type AIPersonality = 'aggressive' | 'cautious' | 'unpredictable'

export interface Point {
  x: number
  y: number
}

export interface PlayerTurf {
  id: string
  nickname: string
  x: number
  y: number
  dir: Dir
  nextDir: Dir
  colorIndex: number
  score: number
  isAlive: boolean
  trail: Point[]
  personality: AIPersonality
}

export type TurfStatus = 'ready' | 'playing' | 'over'

export interface GridTurfState {
  grid: number[][] // 0: Neutral, 1~5: Player color index
  players: PlayerTurf[]
  status: TurfStatus
  timeLeftMs: number
  lastKillMsg: string | null
}

export const PLAYER_COLORS = [
  '#3b82f6', // Blue (P1)
  '#10b981', // Emerald (P2)
  '#a855f7', // Purple (P3)
  '#f59e0b', // Amber (P4)
  '#f43f5e', // Rose (P5)
]

const PERSONALITIES: AIPersonality[] = ['aggressive', 'cautious', 'unpredictable']

export function getRandomPersonality(random: () => number = Math.random): AIPersonality {
  return PERSONALITIES[Math.floor(random() * PERSONALITIES.length)]
}

export function createGridTurfState(initialStatus: TurfStatus = 'ready', random: () => number = Math.random): GridTurfState {
  const grid: number[][] = Array.from({length: TURF_GRID_SIZE}, () => Array(TURF_GRID_SIZE).fill(0))

  // 4개 모서리 3x3 초기 영토 할당 및 매판 랜덤 성격 부여 (30x30 맵 스케일)
  const players: PlayerTurf[] = [
    {id: 'p1', nickname: '나 (P1)', x: 3, y: 3, dir: 'right', nextDir: 'right', colorIndex: 1, score: 9, isAlive: true, trail: [], personality: 'cautious'},
    {id: 'p2', nickname: 'AI 봇 1', x: 26, y: 26, dir: 'left', nextDir: 'left', colorIndex: 2, score: 9, isAlive: true, trail: [], personality: getRandomPersonality(random)},
    {id: 'p3', nickname: 'AI 봇 2', x: 3, y: 26, dir: 'up', nextDir: 'up', colorIndex: 3, score: 9, isAlive: true, trail: [], personality: getRandomPersonality(random)},
    {id: 'p4', nickname: 'AI 봇 3', x: 26, y: 3, dir: 'down', nextDir: 'down', colorIndex: 4, score: 9, isAlive: true, trail: [], personality: getRandomPersonality(random)},
  ]

  // 초기 3x3 기지 세팅 (30x30 스케일)
  const bases = [
    {x1: 1, y1: 1, x2: 3, y2: 3, c: 1},
    {x1: 26, y1: 26, x2: 28, y2: 28, c: 2},
    {x1: 1, y1: 26, x2: 3, y2: 28, c: 3},
    {x1: 26, y1: 1, x2: 28, y2: 3, c: 4},
  ]

  bases.forEach(b => {
    for (let r = b.y1; r <= b.y2; r++) {
      for (let c = b.x1; c <= b.x2; c++) {
        grid[r][c] = b.c
      }
    }
  })

  return {
    grid,
    players,
    status: initialStatus,
    timeLeftMs: 45000,
    lastKillMsg: null
  }
}

export function startGridTurfGame(state: GridTurfState): GridTurfState {
  return {
    ...state,
    status: 'playing'
  }
}

export function setPlayerDirection(state: GridTurfState, playerId: string, dir: Dir): GridTurfState {
  if (state.status !== 'playing') return state

  const pIndex = state.players.findIndex(p => p.id === playerId)
  if (pIndex === -1 || !state.players[pIndex].isAlive) return state

  const p = state.players[pIndex]

  // 180도 정반대 방향 이동 제한
  if (
      (dir === 'up' && p.dir === 'down') ||
      (dir === 'down' && p.dir === 'up') ||
      (dir === 'left' && p.dir === 'right') ||
      (dir === 'right' && p.dir === 'left')
  ) {
    return state
  }

  const nextPlayers = [...state.players]
  nextPlayers[pIndex] = {
    ...p,
    nextDir: dir
  }

  return { ...state, players: nextPlayers }
}

// 2D Flood Fill Territory Enclosure Capture
function captureEnclosedTerritory(grid: number[][], colorIndex: number, trail: Point[]): number[][] {
  const nextGrid = grid.map(row => [...row])

  // 1. 꼬리(Trail) 타일 내 땅으로 변환
  trail.forEach(pt => {
    if (pt.y >= 0 && pt.y < TURF_GRID_SIZE && pt.x >= 0 && pt.x < TURF_GRID_SIZE) {
      nextGrid[pt.y][pt.x] = colorIndex
    }
  })

  // 2. 바닥 외부 바운더리 Flood Fill 탐색
  const visited: boolean[][] = Array.from({length: TURF_GRID_SIZE}, () => Array(TURF_GRID_SIZE).fill(false))
  const queue: Point[] = []

  for (let i = 0; i < TURF_GRID_SIZE; i++) {
    const borders = [
      {x: i, y: 0},
      {x: i, y: TURF_GRID_SIZE - 1},
      {x: 0, y: i},
      {x: TURF_GRID_SIZE - 1, y: i}
    ]
    borders.forEach(pt => {
      if (nextGrid[pt.y][pt.x] !== colorIndex && !visited[pt.y][pt.x]) {
        visited[pt.y][pt.x] = true
        queue.push(pt)
      }
    })
  }

  const dirs = [{x: 0, y: -1}, {x: 0, y: 1}, {x: -1, y: 0}, {x: 1, y: 0}]

  while (queue.length > 0) {
    const curr = queue.shift()!
    for (const d of dirs) {
      const nx = curr.x + d.x
      const ny = curr.y + d.y
      if (nx >= 0 && nx < TURF_GRID_SIZE && ny >= 0 && ny < TURF_GRID_SIZE) {
        if (!visited[ny][nx] && nextGrid[ny][nx] !== colorIndex) {
          visited[ny][nx] = true
          queue.push({x: nx, y: ny})
        }
      }
    }
  }

  for (let r = 0; r < TURF_GRID_SIZE; r++) {
    for (let c = 0; c < TURF_GRID_SIZE; c++) {
      if (!visited[r][c] && nextGrid[r][c] !== colorIndex) {
        nextGrid[r][c] = colorIndex
      }
    }
  }

  return nextGrid
}

export function tickGridTurf(state: GridTurfState, deltaMs: number, random: () => number = Math.random): GridTurfState {
  if (state.status !== 'playing') return state

  const timeLeftMs = Math.max(0, state.timeLeftMs - deltaMs)
  if (timeLeftMs <= 0) {
    return { ...state, timeLeftMs: 0, status: 'over' }
  }

  let nextGrid = state.grid.map(row => [...row])
  let nextPlayers = state.players.map(p => ({ ...p, trail: [...p.trail] }))
  let lastKillMsg = state.lastKillMsg

  // 1. 성격 기반 지능형 AI 행동 엔진 (Personality-driven AI Brain)
  nextPlayers.forEach(p => {
    if (p.id !== 'p1' && p.isAlive) {
      const candidateDirs: Dir[] = ['up', 'down', 'left', 'right']

      // 안전한 방향 필터링 (자기 꼬리 및 180도 역회전 차단)
      const safeDirs = candidateDirs.filter(d => {
        if (d === 'up' && p.dir === 'down') return false
        if (d === 'down' && p.dir === 'up') return false
        if (d === 'left' && p.dir === 'right') return false
        if (d === 'right' && p.dir === 'left') return false

        let tx = p.x
        let ty = p.y
        if (d === 'up') ty--
        else if (d === 'down') ty++
        else if (d === 'left') tx--
        else if (d === 'right') tx++

        if (tx < 0 || tx >= TURF_GRID_SIZE || ty < 0 || ty >= TURF_GRID_SIZE) return false
        if (p.trail.some(pt => pt.x === tx && pt.y === ty)) return false

        return true
      })

      if (safeDirs.length > 0) {
        // 🔥 공격형 AI (Aggressive): 근처 적 꼬리 조준 사냥 모드!
        if (p.personality === 'aggressive') {
          let huntedDir: Dir | null = null
          // 근처 타 플레이어의 꼬리 탐색
          for (const enemy of nextPlayers) {
            if (enemy.isAlive && enemy.id !== p.id && enemy.trail.length > 0) {
              const targetPt = enemy.trail[enemy.trail.length - 1]
              for (const d of safeDirs) {
                let tx = p.x
                let ty = p.y
                if (d === 'up') ty--
                else if (d === 'down') ty++
                else if (d === 'left') tx--
                else if (d === 'right') tx++
                const distBefore = Math.abs(p.x - targetPt.x) + Math.abs(p.y - targetPt.y)
                const distAfter = Math.abs(tx - targetPt.x) + Math.abs(ty - targetPt.y)
                if (distAfter < distBefore && distBefore <= 6) {
                  huntedDir = d
                  break
                }
              }
            }
          }

          if (huntedDir) {
            p.nextDir = huntedDir
            return
          }

          // 공격형은 꼬리가 8칸 이상으로 아주 길어질 때만 귀환
          if (p.trail.length >= 8) {
            const homeDirs = safeDirs.filter(d => {
              let tx = p.x, ty = p.y
              if (d === 'up') ty--; else if (d === 'down') ty++; else if (d === 'left') tx--; else if (d === 'right') tx++;
              return nextGrid[ty][tx] === p.colorIndex
            })
            if (homeDirs.length > 0) {
              p.nextDir = homeDirs[Math.floor(random() * homeDirs.length)]
              return
            }
          }
        }

        // 🛡️ 신중한 안전형 AI (Cautious): 짧은 꼬리 유지 + 적 접근 시 즉시 귀환
        if (p.personality === 'cautious') {
          if (p.trail.length >= 3) {
            const homeDirs = safeDirs.filter(d => {
              let tx = p.x, ty = p.y
              if (d === 'up') ty--; else if (d === 'down') ty++; else if (d === 'left') tx--; else if (d === 'right') tx++;
              return nextGrid[ty][tx] === p.colorIndex
            })
            if (homeDirs.length > 0) {
              p.nextDir = homeDirs[Math.floor(random() * homeDirs.length)]
              return
            }
          }
        }

        // 🎲 예측불가 변칙형 AI (Unpredictable): 35% 확률로 90도 기습 급커브
        if (p.personality === 'unpredictable' && random() < 0.35) {
          p.nextDir = safeDirs[Math.floor(random() * safeDirs.length)]
          return
        }

        // 기본 안전 유지
        if (safeDirs.includes(p.dir) && random() < 0.8) {
          p.nextDir = p.dir
        } else {
          p.nextDir = safeDirs[Math.floor(random() * safeDirs.length)]
        }
      }
    }
  })

  // 2. 플레이어 1칸 이동 진행
  nextPlayers.forEach(p => {
    if (!p.isAlive) return

    p.dir = p.nextDir
    let nx = p.x
    let ny = p.y

    if (p.dir === 'up') ny--
    else if (p.dir === 'down') ny++
    else if (p.dir === 'left') nx--
    else if (p.dir === 'right') nx++

    nx = Math.max(0, Math.min(TURF_GRID_SIZE - 1, nx))
    ny = Math.max(0, Math.min(TURF_GRID_SIZE - 1, ny))

    // 자기 꼬리 충돌 자살
    if (p.trail.some(pt => pt.x === nx && pt.y === ny)) {
      p.isAlive = false
      p.trail = []
      for (let r = 0; r < TURF_GRID_SIZE; r++) {
        for (let c = 0; c < TURF_GRID_SIZE; c++) {
          if (nextGrid[r][c] === p.colorIndex) nextGrid[r][c] = 0
        }
      }
      if (p.id === 'p1') lastKillMsg = '💥 자기 꼬리에 부딪혀 자살하셨습니다!'
      return
    }

    p.x = nx
    p.y = ny

    if (nextGrid[ny][nx] === p.colorIndex) {
      if (p.trail.length > 0) {
        nextGrid = captureEnclosedTerritory(nextGrid, p.colorIndex, p.trail)
        p.trail = []
      }
    } else {
      p.trail.push({x: nx, y: ny})
    }
  })

  // 3. 상대방 꼬리 끊기(Tail Cut Elimination) 검사
  nextPlayers.forEach(attacker => {
    if (!attacker.isAlive) return
    nextPlayers.forEach(victim => {
      if (!victim.isAlive || victim.id === attacker.id) return

      if (victim.trail.some(pt => pt.x === attacker.x && pt.y === attacker.y)) {
        victim.isAlive = false
        victim.trail = []
        for (let r = 0; r < TURF_GRID_SIZE; r++) {
          for (let c = 0; c < TURF_GRID_SIZE; c++) {
            if (nextGrid[r][c] === victim.colorIndex) nextGrid[r][c] = 0
          }
        }
        lastKillMsg = `💥 ${attacker.nickname} 님이 ${victim.nickname} 님의 꼬리를 끊어 처치했습니다!`
      }
    })
  })

  // 4. 점유 타일 수(Score) 갱신
  const counts = Array(6).fill(0)
  for (let r = 0; r < TURF_GRID_SIZE; r++) {
    for (let c = 0; c < TURF_GRID_SIZE; c++) {
      counts[nextGrid[r][c]]++
    }
  }

  nextPlayers.forEach(p => {
    p.score = counts[p.colorIndex]
  })

  const p1 = nextPlayers.find(p => p.id === 'p1')
  const alivePlayers = nextPlayers.filter(p => p.isAlive)

  let status: TurfStatus = state.status
  if (p1 && !p1.isAlive) {
    status = 'over'
  } else if (alivePlayers.length <= 1) {
    status = 'over'
  }

  return {
    grid: nextGrid,
    players: nextPlayers,
    status,
    timeLeftMs,
    lastKillMsg
  }
}
