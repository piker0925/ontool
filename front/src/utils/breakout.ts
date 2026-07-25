// 벽돌깨기: 패들로 공을 튕겨 위쪽 벽돌을 전부 깬다. 물리는 단순 벡터 반사 계산뿐이라
// 물리엔진이 필요 없다.
export interface Ball {
    x: number
    y: number
    vx: number
    vy: number
}

export interface BreakoutState {
    boardWidth: number
    boardHeight: number
    paddleX: number
    paddleWidth: number
    ball: Ball
    bricks: boolean[][]
    score: number
    status: 'playing' | 'won' | 'lost'
}

const BALL_RADIUS = 6
const BRICK_ROWS = 4
const BRICK_COLS = 8

export function createBreakoutState(boardWidth = 320, boardHeight = 400): BreakoutState {
    const paddleWidth = 60
    return {
        boardWidth,
        boardHeight,
        paddleX: (boardWidth - paddleWidth) / 2,
        paddleWidth,
        ball: {x: boardWidth / 2, y: boardHeight - 40, vx: 2, vy: -3},
        bricks: Array.from({length: BRICK_ROWS}, () => Array(BRICK_COLS).fill(true)),
        score: 0,
        status: 'playing',
    }
}

// 패들은 보드 안에서만 좌우로 움직인다(경계를 벗어나지 않도록 clamp).
export function movePaddle(state: BreakoutState, x: number): BreakoutState {
    const clamped = Math.max(0, Math.min(state.boardWidth - state.paddleWidth, x))
    return {...state, paddleX: clamped}
}

function brickBounds(index: number, boardWidth: number) {
    const brickWidth = boardWidth / BRICK_COLS
    const brickHeight = 16
    const row = Math.floor(index / BRICK_COLS)
    const col = index % BRICK_COLS
    return {
        x: col * brickWidth,
        y: 30 + row * brickHeight,
        width: brickWidth,
        height: brickHeight,
        row,
        col,
    }
}

export function tick(state: BreakoutState, dtMs: number): BreakoutState {
    if (state.status !== 'playing') return state

    const factor = dtMs / 16
    let {x, y, vx, vy} = state.ball
    x += vx * factor
    y += vy * factor

    // 좌우 벽 반사
    if (x - BALL_RADIUS <= 0) {
        x = BALL_RADIUS
        vx = Math.abs(vx)
    } else if (x + BALL_RADIUS >= state.boardWidth) {
        x = state.boardWidth - BALL_RADIUS
        vx = -Math.abs(vx)
    }

    // 위쪽 벽 반사
    if (y - BALL_RADIUS <= 0) {
        y = BALL_RADIUS
        vy = Math.abs(vy)
    }

    // 패들 반사 — 패들에 맞았을 때만 아래→위로 반사, 그 외엔 그대로 두고 바닥 판정에 맡긴다.
    const paddleY = state.boardHeight - 20
    const hitsPaddle = vy > 0 && y + BALL_RADIUS >= paddleY && y - BALL_RADIUS <= paddleY
        && x >= state.paddleX && x <= state.paddleX + state.paddleWidth
    if (hitsPaddle) {
        y = paddleY - BALL_RADIUS
        vy = -Math.abs(vy)
    }

    // 바닥에 닿으면 게임 오버(패배)
    if (y - BALL_RADIUS > state.boardHeight) {
        return {...state, status: 'lost'}
    }

    // 벽돌 충돌 판정 — 살아있는 벽돌 중 공과 겹치는 첫 벽돌만 깨고, 그 벽돌 면(수직/수평)에
    // 맞게 반사한다. 한 틱에 여러 벽돌을 동시에 깨지 않아 물리가 단순해도 튐 방향이 안정적이다.
    const bricks = state.bricks.map(row => [...row])
    let scoreGained = 0
    outer: for (let r = 0; r < bricks.length; r++) {
        for (let c = 0; c < bricks[r].length; c++) {
            if (!bricks[r][c]) continue
            const b = brickBounds(r * BRICK_COLS + c, state.boardWidth)
            const overlapsX = x + BALL_RADIUS > b.x && x - BALL_RADIUS < b.x + b.width
            const overlapsY = y + BALL_RADIUS > b.y && y - BALL_RADIUS < b.y + b.height
            if (overlapsX && overlapsY) {
                bricks[r][c] = false
                scoreGained++
                vy = -vy
                break outer
            }
        }
    }

    const remaining = bricks.some(row => row.some(alive => alive))
    const status: BreakoutState['status'] = remaining ? 'playing' : 'won'

    return {
        ...state,
        ball: {x, y, vx, vy},
        bricks,
        score: state.score + scoreGained,
        status,
    }
}
