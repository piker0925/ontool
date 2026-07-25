import {describe, expect, it} from 'vitest'
import {createTowerStackState, placeBlock, tick, type TowerStackState} from './towerStack'

function stateWith(overrides: Partial<TowerStackState>): TowerStackState {
    return {...createTowerStackState(300), ...overrides}
}

describe('createTowerStackState', () => {
    it('보드 중앙에 첫 블록 하나로 시작하고 점수는 0이다', () => {
        const state = createTowerStackState(300)
        expect(state.stack.length).toBe(1)
        expect(state.score).toBe(0)
        expect(state.status).toBe('playing')
    })
})

describe('tick — 이동', () => {
    it('현재 블록이 방향에 따라 이동한다', () => {
        const state = stateWith({current: {x: 50, width: 100}, direction: 1, speed: 2})
        const next = tick(state, 16)
        expect(next.current.x).toBeGreaterThan(50)
    })

    it('오른쪽 경계에 닿으면 방향이 반전된다', () => {
        const state = stateWith({current: {x: 195, width: 100}, direction: 1, speed: 10, boardWidth: 300})
        const next = tick(state, 16)
        expect(next.current.x).toBe(200) // boardWidth(300) - width(100)
        expect(next.direction).toBe(-1)
    })

    it('왼쪽 경계에 닿으면 방향이 반전된다', () => {
        const state = stateWith({current: {x: 5, width: 100}, direction: -1, speed: 10, boardWidth: 300})
        const next = tick(state, 16)
        expect(next.current.x).toBe(0)
        expect(next.direction).toBe(1)
    })

    it('게임 오버 상태에서는 tick이 상태를 바꾸지 않는다', () => {
        const state = stateWith({status: 'over'})
        const next = tick(state, 16)
        expect(next).toEqual(state)
    })
})

describe('placeBlock — 겹침 판정', () => {
    it('완전히 겹치면 너비가 그대로 유지되고 점수가 오른다', () => {
        const state = stateWith({
            stack: [{x: 100, width: 100}],
            current: {x: 100, width: 100},
        })
        const next = placeBlock(state)
        expect(next.stack[1]).toEqual({x: 100, width: 100})
        expect(next.score).toBe(1)
        expect(next.status).toBe('playing')
    })

    it('일부만 겹치면 겹치는 구간만큼만 너비가 줄어든다', () => {
        const state = stateWith({
            stack: [{x: 100, width: 100}], // 100~200
            current: {x: 150, width: 100}, // 150~250, 겹침 150~200 = 50
        })
        const next = placeBlock(state)
        expect(next.stack[1]).toEqual({x: 150, width: 50})
        expect(next.score).toBe(1)
    })

    it('전혀 겹치지 않으면 게임 오버가 되고 스택에 추가되지 않는다', () => {
        const state = stateWith({
            stack: [{x: 0, width: 50}], // 0~50
            current: {x: 200, width: 50}, // 200~250, 겹침 없음
        })
        const next = placeBlock(state)
        expect(next.status).toBe('over')
        expect(next.stack.length).toBe(1)
    })

    it('블록을 쌓을수록 속도가 빨라진다(난이도 상승)', () => {
        const state = stateWith({
            stack: [{x: 100, width: 100}],
            current: {x: 100, width: 100},
        })
        const next = placeBlock(state)
        expect(next.speed).toBeGreaterThan(state.speed)
    })

    it('게임 오버 상태에서는 placeBlock을 호출해도 상태가 바뀌지 않는다', () => {
        const state = stateWith({status: 'over'})
        const next = placeBlock(state)
        expect(next).toEqual(state)
    })
})
