import {describe, expect, it} from 'vitest'
import {createFlappyState, flapBird, FLAPPY_HEIGHT, FLAPPY_WIDTH, startFlappyGame, tickFlappy} from './flappyBird'

describe('flappyBird game engine', () => {
    it('초기 상태 생성 시 ready 상태이고 startFlappyGame 시 playing이 된다', () => {
        let state = createFlappyState('ready')
        expect(state.status).toBe('ready')
        state = startFlappyGame(state)
        expect(state.status).toBe('playing')
        expect(state.birdY).toBe(FLAPPY_HEIGHT / 2)
        expect(state.score).toBe(0)
    })

    it('날개짓(flapBird) 시 상승 속도(-vy)가 부여된다', () => {
        let state = createFlappyState('playing')
        state = flapBird(state)
        expect(state.vy).toBeLessThan(0)
    })

    it('파이프 충돌 시 게임 오버 상태가 된다', () => {
        let state = createFlappyState('playing')
        state.pipes = [{ id: 1, x: 60, gapTop: 50, gapBottom: 400, passed: false }]
        state.birdY = 30
        const { nextState } = tickFlappy(state, 50)
        expect(nextState.status).toBe('over')
    })
})
