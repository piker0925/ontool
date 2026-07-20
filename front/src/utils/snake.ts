export interface Point {
    x: number
    y: number
}

export type Direction = 'up' | 'down' | 'left' | 'right'

export interface SnakeState {
    snake: Point[]
    direction: Direction
    food: Point
    status: 'playing' | 'over'
    score: number
}

const DELTA: Record<Direction, Point> = {
    up: {x: 0, y: -1},
    down: {x: 0, y: 1},
    left: {x: -1, y: 0},
    right: {x: 1, y: 0},
}

const OPPOSITE: Record<Direction, Direction> = {
    up: 'down',
    down: 'up',
    left: 'right',
    right: 'left',
}

// 뱀이 보드 전체를 채우면 빈 칸이 없다 — 이 경우 null을 반환하고 호출부가 이전 food를 유지한다.
function placeFood(snake: Point[], gridSize: number, random: () => number): Point | null {
    const empties: Point[] = []
    for (let x = 0; x < gridSize; x++) {
        for (let y = 0; y < gridSize; y++) {
            if (!snake.some(s => s.x === x && s.y === y)) empties.push({x, y})
        }
    }
    if (empties.length === 0) return null
    return empties[Math.floor(random() * empties.length)]
}

export function createSnakeGame(gridSize: number, random: () => number = Math.random): SnakeState {
    const start = {x: Math.floor(gridSize / 2), y: Math.floor(gridSize / 2)}
    const snake = [start]
    return {
        snake,
        direction: 'right',
        // 새 게임 시작 시점엔 뱀이 한 칸뿐이라 사실상 항상 값이 있다 — 극단적으로 gridSize가 1이라도
        // 안전하게 동작하도록 폴백만 둔다.
        food: placeFood(snake, gridSize, random) ?? {x: 0, y: 0},
        status: 'playing',
        score: 0,
    }
}

export function changeDirection(state: SnakeState, direction: Direction): SnakeState {
    if (state.snake.length > 1 && OPPOSITE[direction] === state.direction) return state
    return {...state, direction}
}

export function tick(state: SnakeState, gridSize: number, random: () => number = Math.random): SnakeState {
    if (state.status !== 'playing') return state

    const delta = DELTA[state.direction]
    const head = state.snake[0]
    const newHead: Point = {x: head.x + delta.x, y: head.y + delta.y}

    const outOfBounds = newHead.x < 0 || newHead.x >= gridSize || newHead.y < 0 || newHead.y >= gridSize
    if (outOfBounds) return {...state, status: 'over'}

    const eating = newHead.x === state.food.x && newHead.y === state.food.y
    // 꼬리는 안 먹었을 때만 이번 틱에 비워지므로, 그 경우엔 충돌 판정에서 제외한다.
    const bodyToCheck = eating ? state.snake : state.snake.slice(0, -1)
    const selfCollision = bodyToCheck.some(seg => seg.x === newHead.x && seg.y === newHead.y)
    if (selfCollision) return {...state, status: 'over'}

    const newSnake = eating ? [newHead, ...state.snake] : [newHead, ...state.snake.slice(0, -1)]

    return {
        snake: newSnake,
        direction: state.direction,
        food: eating ? (placeFood(newSnake, gridSize, random) ?? state.food) : state.food,
        status: 'playing',
        score: eating ? state.score + 1 : state.score,
    }
}
