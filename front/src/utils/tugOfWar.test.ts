import {describe, expect, it} from 'vitest'
import {createTugState, pullRope, startTugGame, tickTug} from './tugOfWar'

describe('tugOfWar game engine', () => {
    it('초기 상태 생성 시 ready 상태이고 startTugGame 시 playing이 된다', () => {
        let state = createTugState('ready')
        expect(state.status).toBe('ready')
        state = startTugGame(state)
        expect(state.status).toBe('playing')
        expect(state.ropePosition).toBe(0)
        expect(state.timeLeftMs).toBe(10000)
    })

    it('연타 조작(pullRope) 시 팀 방향으로 로프가 끌려오고 CPS가 증가한다', () => {
        let state = createTugState('playing')
        state = pullRope(state, 'A', 1000)
        expect(state.ropePosition).toBeLessThan(0)
        expect(state.cps).toBeGreaterThan(0)
        state = pullRope(state, 'B', 1000)
        expect(state.ropePosition).toBe(0)
    })

    it('제한시간 종료 시 우세한 팀이 승리한다', () => {
        let state = createTugState('playing')
        state.ropePosition = -30
        state.teamAPulls = 20
        state.teamBPulls = 10
        state.timeLeftMs = 100
        const {nextState} = tickTug(state, 100)
        expect(nextState.status).toBe('over')
        expect(nextState.winnerTeam).toBe('A')
    })
})
