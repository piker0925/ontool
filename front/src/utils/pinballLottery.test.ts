import {describe, expect, it} from 'vitest'
import {createPinballState, startPinball, tickPinball} from './pinballLottery'

describe('pinballLottery engine', () => {
    it('초기 마운트 시 핀볼 트랙과 구슬이 정상 생성된다', () => {
        const state = createPinballState(['알리스', '밥', '찰리'], 'first')
        expect(state.balls.length).toBe(3)
        expect(state.pegs.length).toBeGreaterThan(0)
        expect(state.status).toBe('idle')
    })

    it('startPinball 시 status가 running이 된다', () => {
        let state = createPinballState()
        state = startPinball(state)
        expect(state.status).toBe('running')
    })

    it('충분히 tick되면 구슬이 바닥에 도착하고 winner가 결정된다', () => {
        let state = createPinballState(['A', 'B'], 'first')
        state = startPinball(state)

        for (let i = 0; i < 500; i++) {
            state = tickPinball(state, 50)
            if (state.status === 'finished') break
        }

        expect(state.status).toBe('finished')
        expect(state.winner).not.toBeNull()
    })
})
