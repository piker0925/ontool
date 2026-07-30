import {describe, expect, it} from 'vitest'
import {createCrossyState, moveChicken, startCrossyGame, tickCrossy} from './crossyRoad'

describe('crossyRoad game engine', () => {
    it('초기 상태 생성 시 ready 상태이고 startCrossyGame 시 playing이 된다', () => {
        let state = createCrossyState('ready')
        expect(state.status).toBe('ready')
        state = startCrossyGame(state)
        expect(state.status).toBe('playing')
        expect(state.chickenX).toBe(4)
        expect(state.chickenY).toBe(0)
        expect(state.score).toBe(0)
        expect(state.lanes.length).toBeGreaterThan(10)
    })

    it('전진 조작(moveChicken up) 시 chickenY가 1 증가하고 점수가 오른다', () => {
        let state = createCrossyState('playing')
        state = moveChicken(state, 'up')
        expect(state.chickenY).toBe(1)
        expect(state.score).toBe(1)
    })

    it('차선 도로 충돌 시 게임 오버된다', () => {
        let state = createCrossyState('playing')
        state.chickenY = 1
        state.chickenX = 4
        state.lanes[1] = { type: 'road', dir: 1, speed: 200, vehicles: [{ id: 1, x: 230, width: 40 }] }

        const {nextState} = tickCrossy(state, 50)
        expect(nextState.status).toBe('over')
    })
})
