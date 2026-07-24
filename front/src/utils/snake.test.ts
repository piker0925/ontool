import {describe, expect, it} from 'vitest'
import {createSnakeGame, type Direction, MAX_QUEUED_DIRECTIONS, queueDirection, type SnakeState, tick} from './snake'

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

describe('queueDirection — 입력 버퍼링', () => {
    it('큐에 이미 대기 중인 방향이 있으면, 현재 이동 방향이 아니라 큐의 마지막 방향을 기준으로 반대 방향을 거른다', () => {
        // 현재는 오른쪽으로 이동 중이지만, 이미 큐에 'down'이 대기 중이다.
        // 이 상태에서 'up'(down의 반대)을 넣으려 하면 거절되어야 한다 — 'right'의 반대인 'left'가 아니므로
        // 현재 방향 기준 검사로는 통과해버리는 게 버그였다.
        const state = stateWith({direction: 'right'})
        const queue = queueDirection(state, ['down'], 'up')
        expect(queue).toEqual(['down'])
    })

    it('큐가 비어있으면 현재 이동 방향을 기준으로 반대 방향을 거른다', () => {
        const state = stateWith({direction: 'right'})
        const queue = queueDirection(state, [], 'left')
        expect(queue).toEqual([])
    })

    it('유효한 방향 전환은 큐 끝에 추가된다', () => {
        const state = stateWith({direction: 'right'})
        const queue = queueDirection(state, [], 'down')
        expect(queue).toEqual(['down'])
    })

    it('큐가 이미 최대 크기면 추가 입력은 버려진다', () => {
        const state = stateWith({direction: 'right'})
        const fullQueue: Direction[] = ['down', 'left']
        expect(fullQueue.length).toBe(MAX_QUEUED_DIRECTIONS) // 이 테스트의 전제("가득 찬 큐")가 상수와 어긋나지 않는지 보장
        const queue = queueDirection(state, fullQueue, 'up')
        expect(queue).toEqual(fullQueue)
    })

    it('AC: 오른쪽 이동 중인 몸통 길이 3 이상 뱀에서 한 틱 안에 아래→왼쪽을 연달아 넣어도, 두 틱에 걸쳐 순서대로 적용되어 몸통 역주행으로 죽지 않는다', () => {
        // 몸통이 있어야만(길이>1) 자기 몸 충돌이 성립한다 — 이 테스트가 바로 이슈가 말하는
        // "몸통 역주행으로 인한 예기치 않은 게임오버" 재현·회귀 방지 테스트다.
        // 만약 구현이 버그처럼 "큐를 무시하고 마지막 입력만 즉시 반영"한다면, 머리가 (5,5)에서
        // 곧장 왼쪽(4,5)으로 이동해 몸통(직전 세그먼트)과 충돌해 status가 'over'가 된다 —
        // 그 잘못된 동작과 이 버퍼링 동작을 구분하는 assertion이다.
        const s0 = stateWith({snake: [{x: 5, y: 5}, {x: 4, y: 5}, {x: 3, y: 5}], direction: 'right', food: {x: 9, y: 9}})
        let queue: Direction[] = []
        queue = queueDirection(s0, queue, 'down')
        queue = queueDirection(s0, queue, 'left')
        expect(queue).toEqual(['down', 'left'])

        const s1 = tick(s0, GRID, () => 0.5, queue.shift())
        expect(s1.status).toBe('playing')
        expect(s1.snake[0]).toEqual({x: 5, y: 6}) // 아래로 한 칸

        const s2 = tick(s1, GRID, () => 0.5, queue.shift())
        expect(s2.status).toBe('playing')
        expect(s2.snake[0]).toEqual({x: 4, y: 6}) // 이제 왼쪽으로 한 칸 — 몸통과 충돌하지 않음
    })
})

describe('tick — 이동', () => {
    it('먹이가 없는 칸으로 이동하면 길이는 그대로고 머리만 전진, 꼬리가 빠진다', () => {
        const state = stateWith({snake: [{x: 5, y: 5}, {x: 4, y: 5}, {x: 3, y: 5}], direction: 'right', food: {x: 9, y: 9}})
        const next = tick(state, GRID, () => 0.5)
        expect(next.snake).toEqual([{x: 6, y: 5}, {x: 5, y: 5}, {x: 4, y: 5}])
        expect(next.score).toBe(0)
    })

    it('큐에서 꺼낸 방향이 주어지면 state.direction 대신 그 방향으로 이동하고, 결과 상태의 direction도 갱신된다', () => {
        // 오른쪽으로 이동 중이지만 큐에서 꺼낸 방향은 'down' — 실제로는 아래로 이동해야 한다.
        const state = stateWith({snake: [{x: 5, y: 5}, {x: 4, y: 5}, {x: 3, y: 5}], direction: 'right', food: {x: 9, y: 9}})
        const next = tick(state, GRID, () => 0.5, 'down')
        expect(next.snake[0]).toEqual({x: 5, y: 6})
        expect(next.direction).toBe('down')
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
