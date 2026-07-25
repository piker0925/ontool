import {describe, expect, it} from 'vitest'
import {type BreakoutState, createBreakoutState, movePaddle, tick} from './breakout'

function stateWith(overrides: Partial<BreakoutState>): BreakoutState {
    return {...createBreakoutState(320, 400), ...overrides}
}

describe('movePaddle', () => {
    it('보드 왼쪽 경계를 벗어나지 않도록 clamp한다', () => {
        const state = createBreakoutState(320, 400)
        const next = movePaddle(state, -50)
        expect(next.paddleX).toBe(0)
    })

    it('보드 오른쪽 경계를 벗어나지 않도록 clamp한다', () => {
        const state = createBreakoutState(320, 400)
        const next = movePaddle(state, 1000)
        expect(next.paddleX).toBe(state.boardWidth - state.paddleWidth)
    })
})

describe('tick — 벽 반사', () => {
    it('왼쪽 벽에 닿으면 x가 반사되고 vx가 양수로 바뀐다', () => {
        const state = stateWith({ball: {x: 2, y: 200, vx: -5, vy: 0}})
        const next = tick(state, 16)
        expect(next.ball.vx).toBeGreaterThan(0)
        expect(next.ball.x).toBeGreaterThanOrEqual(0)
    })

    it('위쪽 벽에 닿으면 vy가 양수(아래 방향)로 바뀐다', () => {
        const state = stateWith({ball: {x: 160, y: 2, vx: 0, vy: -5}})
        const next = tick(state, 16)
        expect(next.ball.vy).toBeGreaterThan(0)
    })
})

describe('tick — 패들 충돌', () => {
    it('패들에 맞으면 공이 위로 튕긴다(vy가 음수로 바뀜)', () => {
        const paddleY = 400 - 20
        const state = stateWith({
            paddleX: 100,
            paddleWidth: 60,
            ball: {x: 130, y: paddleY - 5, vx: 0, vy: 5},
        })
        const next = tick(state, 16)
        expect(next.ball.vy).toBeLessThan(0)
        expect(next.status).toBe('playing')
    })
})

describe('tick — 바닥/승패 판정', () => {
    it('공이 바닥을 넘어가면 lost 상태가 된다', () => {
        const state = stateWith({ball: {x: 160, y: 399, vx: 0, vy: 50}})
        const next = tick(state, 16)
        expect(next.status).toBe('lost')
    })

    it('벽돌에 맞으면 그 벽돌만 깨지고 점수가 오른다', () => {
        const state = stateWith({ball: {x: 5, y: 35, vx: 0, vy: 0}})
        expect(state.bricks[0][0]).toBe(true)

        const next = tick(state, 0)
        expect(next.bricks[0][0]).toBe(false)
        expect(next.score).toBe(1)
        expect(next.status).toBe('playing') // 다른 벽돌이 남아있음
    })

    it('마지막 남은 벽돌을 깨면 won 상태가 된다', () => {
        const bricks = Array.from({length: 4}, () => Array(8).fill(false))
        bricks[0][0] = true // 유일하게 살아있는 벽돌
        const state = stateWith({bricks, ball: {x: 5, y: 35, vx: 0, vy: 0}})

        const next = tick(state, 0)
        expect(next.status).toBe('won')
    })

    it('게임이 끝난 뒤에는 tick을 호출해도 상태가 바뀌지 않는다', () => {
        const state = stateWith({status: 'lost'})
        const next = tick(state, 16)
        expect(next).toEqual(state)
    })
})
