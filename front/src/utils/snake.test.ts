import {describe, expect, it} from 'vitest'
import {changeDirection, createSnakeGame, type SnakeState, tick} from './snake'

const GRID = 10

function stateWith(overrides: Partial<SnakeState>): SnakeState {
    return {
        snake: [{x: 5, y: 5}, {x: 4, y: 5}, {x: 3, y: 5}],
        direction: 'right',
        food: {x: 9, y: 9},
        status: 'playing',
        score: 0,
        ...overrides,
    }
}

describe('createSnakeGame', () => {
    it('뱀 1칸과 격자 안의 먹이 위치로 시작한다', () => {
        const state = createSnakeGame(GRID, () => 0.5)
        expect(state.snake.length).toBeGreaterThan(0)
        expect(state.food.x).toBeGreaterThanOrEqual(0)
        expect(state.food.x).toBeLessThan(GRID)
        expect(state.status).toBe('playing')
        expect(state.score).toBe(0)
    })
})

describe('changeDirection', () => {
    it('진행 방향과 반대로는 즉시 꺾을 수 없다(자기 몸으로 들어가는 것 방지)', () => {
        const state = stateWith({direction: 'right'})
        const next = changeDirection(state, 'left')
        expect(next.direction).toBe('right')
    })

    it('수직 방향으로는 자유롭게 꺾을 수 있다', () => {
        const state = stateWith({direction: 'right'})
        const next = changeDirection(state, 'up')
        expect(next.direction).toBe('up')
    })
})

describe('tick — 이동', () => {
    it('먹이가 없는 칸으로 이동하면 길이는 그대로고 머리만 전진, 꼬리가 빠진다', () => {
        const state = stateWith({snake: [{x: 5, y: 5}, {x: 4, y: 5}, {x: 3, y: 5}], direction: 'right', food: {x: 9, y: 9}})
        const next = tick(state, GRID, () => 0.5)
        expect(next.snake).toEqual([{x: 6, y: 5}, {x: 5, y: 5}, {x: 4, y: 5}])
        expect(next.score).toBe(0)
    })
})

describe('tick — 먹이', () => {
    it('먹이를 먹으면 길이가 정확히 1칸 늘고 점수가 증가한다', () => {
        const state = stateWith({snake: [{x: 5, y: 5}, {x: 4, y: 5}, {x: 3, y: 5}], direction: 'right', food: {x: 6, y: 5}, score: 0})
        const next = tick(state, GRID, () => 0.5)
        expect(next.snake.length).toBe(4)
        expect(next.snake[0]).toEqual({x: 6, y: 5})
        expect(next.score).toBe(1)
    })

    it('먹이를 먹으면 뱀 몸이 아닌 칸에 새 먹이가 생긴다', () => {
        const state = stateWith({snake: [{x: 5, y: 5}, {x: 4, y: 5}, {x: 3, y: 5}], direction: 'right', food: {x: 6, y: 5}})
        const next = tick(state, GRID, () => 0)
        const onSnake = next.snake.some(seg => seg.x === next.food.x && seg.y === next.food.y)
        expect(onSnake).toBe(false)
    })

    it('먹이를 먹어 보드 전체가 뱀으로 가득 차도 죽지 않고 food가 정의된 채로 남는다', () => {
        const state = stateWith({
            snake: [{x: 0, y: 0}, {x: 0, y: 1}, {x: 1, y: 1}], // 2x2 격자에서 (1,0)만 비어있음
            direction: 'right',
            food: {x: 1, y: 0},
        })
        const next = tick(state, 2, () => 0.5)
        expect(next.snake.length).toBe(4)
        expect(next.food).toBeDefined()
        expect(next.status).toBe('playing')
    })
})

describe('tick — 충돌', () => {
    it('벽에 부딪히면 게임 오버가 된다', () => {
        const state = stateWith({snake: [{x: GRID - 1, y: 5}, {x: GRID - 2, y: 5}], direction: 'right'})
        const next = tick(state, GRID, () => 0.5)
        expect(next.status).toBe('over')
    })

    it('자기 몸에 부딪히면 게임 오버가 된다', () => {
        // 고리 모양 몸통: 머리(5,5)가 'up'으로 이동하면 몸통 칸 (5,4)와 충돌 — 꼬리(마지막 칸)가 아니므로
        // "이번 틱에 꼬리가 비워져서 괜찮은 칸"이 아니라 진짜 충돌이다.
        const state = stateWith({
            snake: [
                {x: 5, y: 5}, {x: 5, y: 4}, {x: 6, y: 4}, {x: 6, y: 5}, {x: 6, y: 6}, {x: 5, y: 6},
            ],
            direction: 'up',
        })
        const next = tick(state, GRID, () => 0.5)
        expect(next.status).toBe('over')
    })

    it('게임 오버 상태에서 tick을 호출해도 상태가 바뀌지 않는다', () => {
        const state = stateWith({status: 'over'})
        const next = tick(state, GRID, () => 0.5)
        expect(next).toEqual(state)
    })
})
