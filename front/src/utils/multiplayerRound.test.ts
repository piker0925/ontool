import {describe, expect, it} from 'vitest'
import {handleRoundStarted, type MultiplayerRoundState} from './multiplayerRound'

describe('handleRoundStarted', () => {
    it('로비 상태에서 라운드 시작 이벤트를 받으면 GO 상태로 전이하고 서버 시각을 기록한다', () => {
        const state: MultiplayerRoundState = {phase: 'lobby', goAt: null}

        const next = handleRoundStarted(state, '2026-07-28T12:00:00.000Z')

        expect(next).toEqual({phase: 'go', goAt: '2026-07-28T12:00:00.000Z'})
    })

    it('GO 상태에서 같은 시각의 이벤트를 다시 받으면(중복 전달) 그대로 유지한다', () => {
        const state: MultiplayerRoundState = {phase: 'go', goAt: '2026-07-28T12:00:00.000Z'}

        const next = handleRoundStarted(state, '2026-07-28T12:00:00.000Z')

        expect(next).toEqual(state)
    })

    it('GO 상태에서 다른 시각의 이벤트를 받으면(재대결) 새 GO 시각으로 갱신된다', () => {
        const state: MultiplayerRoundState = {phase: 'go', goAt: '2026-07-28T12:00:00.000Z'}

        const next = handleRoundStarted(state, '2026-07-28T12:05:00.000Z')

        expect(next).toEqual({phase: 'go', goAt: '2026-07-28T12:05:00.000Z'})
    })
})
