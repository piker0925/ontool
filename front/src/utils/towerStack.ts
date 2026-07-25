// Stack형 타이밍 타워쌓기: 좌우로 움직이는 블록을 탭해서 쌓는다. 이번에 놓은 블록이 바로 아래
// 블록과 겹치는 구간만 남기고 잘려나간다 — 겹치는 부분이 없으면(완전히 빗나가면) 게임 오버.
export interface Block {
    x: number
    width: number
}

export interface TowerStackState {
    stack: Block[]
    current: Block
    direction: 1 | -1
    speed: number
    boardWidth: number
    status: 'playing' | 'over'
    score: number
}

const INITIAL_WIDTH = 100
const INITIAL_SPEED = 2
const SPEED_INCREMENT = 0.15

export function createTowerStackState(boardWidth = 300): TowerStackState {
    const base: Block = {x: (boardWidth - INITIAL_WIDTH) / 2, width: INITIAL_WIDTH}
    return {
        stack: [base],
        current: {x: 0, width: INITIAL_WIDTH},
        direction: 1,
        speed: INITIAL_SPEED,
        boardWidth,
        status: 'playing',
        score: 0,
    }
}

// 현재 움직이는 블록을 한 프레임만큼 이동시키고, 보드 경계에 닿으면 방향을 뒤집는다.
export function tick(state: TowerStackState, dtMs: number): TowerStackState {
    if (state.status !== 'playing') return state

    let x = state.current.x + state.direction * state.speed * (dtMs / 16)
    let direction = state.direction
    const maxX = state.boardWidth - state.current.width
    if (x <= 0) {
        x = 0
        direction = 1
    } else if (x >= maxX) {
        x = maxX
        direction = -1
    }

    return {...state, current: {...state.current, x}, direction}
}

// 현재 블록을 스택 맨 위 블록과의 겹치는 구간만큼만 남기고 쌓는다. 겹침이 없으면 게임 오버.
export function placeBlock(state: TowerStackState): TowerStackState {
    if (state.status !== 'playing') return state

    const top = state.stack[state.stack.length - 1]
    const left = Math.max(top.x, state.current.x)
    const right = Math.min(top.x + top.width, state.current.x + state.current.width)
    const overlapWidth = right - left

    if (overlapWidth <= 0) return {...state, status: 'over'}

    const placed: Block = {x: left, width: overlapWidth}
    const stack = [...state.stack, placed]
    const nextCurrent: Block = {x: 0, width: overlapWidth}

    return {
        ...state,
        stack,
        current: nextCurrent,
        direction: 1,
        speed: state.speed + SPEED_INCREMENT,
        score: state.score + 1,
    }
}
