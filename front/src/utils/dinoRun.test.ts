import {describe, expect, it} from 'vitest'
import {createDinoState, jumpDino, tickDino} from './dinoRun'

describe('dinoRun game engine', () => {
    it('초기 상태 생성 시 지면에 서 있고 점수가 0이다', () => {
        const state = createDinoState()
        expect(state.dinoY).toBe(0)
        expect(state.isJumping).toBe(false)
        expect(state.score).toBe(0)
        expect(state.status).toBe('ready')
    })

    it('점프(jumpDino) 시 y 속도가 상승(-vy)하고 점프 상태가 된다', () => {
        let state = createDinoState('playing')
        state = jumpDino(state)
        expect(state.isJumping).toBe(true)
        expect(state.vy).toBeLessThan(0)
    })

    it('시간 진행(tickDino) 시 장애물이 왼쪽으로 이동하고 충돌 시 게임 오버된다', () => {
        let state = createDinoState('playing')
        state.obstacles.push({ id: 1, x: 40, width: 20, height: 40, type: 'cactus' })

        const {nextState} = tickDino(state, 100)
        expect(nextState.status).toBe('over')
    })
})
