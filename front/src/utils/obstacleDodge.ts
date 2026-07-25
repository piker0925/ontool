// 장애물 피하기(플래피버드류): 탭/스페이스로 점프해서 좌에서 우로 흘러오는 관 모양 장애물의
// 틈을 통과한다. 중력·점프는 단순 수식이라 물리엔진이 필요 없다.
export interface Pipe {
    x: number
    gapY: number // 틈의 세로 중심 위치
    passed: boolean // 새가 이미 통과해 점수를 매긴 파이프인지(매 틱 중복 채점 방지)
}

export interface ObstacleDodgeState {
    boardWidth: number
    boardHeight: number
    birdY: number
    birdVelocity: number
    pipes: Pipe[]
    score: number
    status: 'playing' | 'over'
}

const GRAVITY = 0.5
const JUMP_VELOCITY = -7
const BIRD_RADIUS = 10
const PIPE_WIDTH = 40
const GAP_HEIGHT = 110
const PIPE_SPEED = 2
const PIPE_SPACING = 180

export function createObstacleDodgeState(boardWidth = 320, boardHeight = 480): ObstacleDodgeState {
    return {
        boardWidth,
        boardHeight,
        birdY: boardHeight / 2,
        birdVelocity: 0,
        pipes: [{x: boardWidth, gapY: boardHeight / 2, passed: false}],
        score: 0,
        status: 'playing',
    }
}

export function jump(state: ObstacleDodgeState): ObstacleDodgeState {
    if (state.status !== 'playing') return state
    return {...state, birdVelocity: JUMP_VELOCITY}
}

function collides(birdY: number, boardHeight: number, pipes: Pipe[]): boolean {
    if (birdY - BIRD_RADIUS <= 0 || birdY + BIRD_RADIUS >= boardHeight) return true

    const birdX = 60 // 새는 항상 고정된 x 위치에 있고, 파이프가 왼쪽으로 흘러온다.
    return pipes.some(pipe => {
        const overlapsX = birdX + BIRD_RADIUS > pipe.x && birdX - BIRD_RADIUS < pipe.x + PIPE_WIDTH
        if (!overlapsX) return false
        const gapTop = pipe.gapY - GAP_HEIGHT / 2
        const gapBottom = pipe.gapY + GAP_HEIGHT / 2
        return birdY - BIRD_RADIUS < gapTop || birdY + BIRD_RADIUS > gapBottom
    })
}

export function tick(state: ObstacleDodgeState, dtMs: number, random: () => number = Math.random): ObstacleDodgeState {
    if (state.status !== 'playing') return state

    const factor = dtMs / 16
    const birdVelocity = state.birdVelocity + GRAVITY * factor
    const birdY = state.birdY + birdVelocity * factor

    let pipes = state.pipes.map(p => ({...p, x: p.x - PIPE_SPEED * factor}))

    // 새를 완전히 지나친 파이프는 처음 한 번만 점수로 센다(passed 플래그로 중복 채점 방지).
    const birdX = 60
    let scoreGained = 0
    pipes = pipes.map(pipe => {
        if (!pipe.passed && pipe.x + PIPE_WIDTH < birdX) {
            scoreGained++
            return {...pipe, passed: true}
        }
        return pipe
    })
    pipes = pipes.filter(p => p.x + PIPE_WIDTH > -10)

    // 마지막 파이프가 충분히 왼쪽으로 이동했으면 새 파이프를 오른쪽 끝에 추가한다.
    const last = pipes[pipes.length - 1]
    if (!last || state.boardWidth - last.x >= PIPE_SPACING) {
        const margin = GAP_HEIGHT
        const gapY = margin + random() * (state.boardHeight - margin * 2)
        pipes = [...pipes, {x: state.boardWidth, gapY, passed: false}]
    }

    if (collides(birdY, state.boardHeight, pipes)) {
        return {...state, birdY, birdVelocity, pipes, status: 'over'}
    }

    return {
        ...state,
        birdY,
        birdVelocity,
        pipes,
        score: state.score + scoreGained,
        status: 'playing',
    }
}
