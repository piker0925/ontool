import {describe, expect, it} from 'vitest'
import {createObstacleDodgeState, jump, type ObstacleDodgeState, tick} from './obstacleDodge'

function stateWith(overrides: Partial<ObstacleDodgeState>): ObstacleDodgeState {
    return {...createObstacleDodgeState(320, 480), ...overrides}
}

describe('jump', () => {
    it('점프하면 속도가 음수(위 방향)로 바뀐다', () => {
        const state = stateWith({birdVelocity: 5})
        const next = jump(state)
        expect(next.birdVelocity).toBeLessThan(0)
    })

    it('게임이 끝난 상태에서는 점프해도 아무 변화가 없다', () => {
        const state = stateWith({status: 'over'})
        const next = jump(state)
        expect(next).toEqual(state)
    })
})

describe('tick — 중력', () => {
    it('시간이 지날수록 속도가 중력만큼 증가하고 새가 아래로 내려간다', () => {
        const state = stateWith({birdY: 100, birdVelocity: 0, pipes: []})
        const next = tick(state, 16, () => 0.5)
        expect(next.birdVelocity).toBeGreaterThan(0)
        expect(next.birdY).toBeGreaterThan(100)
    })
})

describe('tick — 충돌', () => {
    it('천장에 닿으면 게임 오버가 된다', () => {
        const state = stateWith({birdY: 2, birdVelocity: -10, pipes: []})
        const next = tick(state, 16, () => 0.5)
        expect(next.status).toBe('over')
    })

    it('바닥에 닿으면 게임 오버가 된다', () => {
        const state = stateWith({birdY: 478, birdVelocity: 10, pipes: []})
        const next = tick(state, 16, () => 0.5)
        expect(next.status).toBe('over')
    })

    it('파이프 틈을 벗어난 위치에서 파이프와 겹치면 게임 오버가 된다', () => {
        // 새는 x=60에 고정 — 파이프를 그 위치에 두고, 틈(gapY=240, 높이110 → 185~295)
        // 밖인 birdY=50에 있으면 충돌해야 한다.
        const state = stateWith({birdY: 50, birdVelocity: 0, pipes: [{x: 55, gapY: 240, passed: false}]})
        const next = tick(state, 0, () => 0.5)
        expect(next.status).toBe('over')
    })

    it('파이프 틈 안에 있으면 그 파이프와는 충돌하지 않는다', () => {
        const state = stateWith({birdY: 240, birdVelocity: 0, pipes: [{x: 55, gapY: 240, passed: false}]})
        const next = tick(state, 0, () => 0.5)
        expect(next.status).toBe('playing')
    })
})

describe('tick — 점수', () => {
    it('새를 완전히 지나친 파이프는 점수를 1회만 올린다(매 틱 중복 채점 방지)', () => {
        // birdX=60 기준, 파이프 오른쪽 끝(x+40)이 이미 60보다 왼쪽에 있어 이번 틱에 "막 지나침"으로 처리된다.
        const state = stateWith({birdY: 240, birdVelocity: 0, pipes: [{x: 15, gapY: 240, passed: false}]})
        const next = tick(state, 0, () => 0.5)
        expect(next.score).toBe(1)
        expect(next.pipes[0].passed).toBe(true)

        const next2 = tick(next, 0, () => 0.5)
        expect(next2.score).toBe(1) // 이미 passed라 다시 오르지 않음
    })
})

describe('tick — 게임 종료', () => {
    it('게임 오버 상태에서는 tick을 호출해도 상태가 바뀌지 않는다', () => {
        const state = stateWith({status: 'over'})
        const next = tick(state, 16, () => 0.5)
        expect(next).toEqual(state)
    })
})
