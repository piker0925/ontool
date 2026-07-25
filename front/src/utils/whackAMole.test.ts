import {describe, expect, it} from 'vitest'
import {createWhackAMoleState, MOLE_LIFETIME_MS, tick, whack} from './whackAMole'

describe('createWhackAMoleState', () => {
    it('모든 구멍이 비어있고 점수 0, playing 상태로 시작한다', () => {
        const state = createWhackAMoleState(9, 30000)
        expect(state.holes.every(h => h === false)).toBe(true)
        expect(state.score).toBe(0)
        expect(state.status).toBe('playing')
    })
})

describe('tick — 두더지 등장', () => {
    it('활성 두더지가 없으면 랜덤 구멍에 새로 등장시킨다', () => {
        const state = createWhackAMoleState(9, 30000)
        const next = tick(state, 100, () => 0.5)
        expect(next.activeHole).not.toBeNull()
        expect(next.holes[next.activeHole!]).toBe(true)
    })

    it('이미 두더지가 활성 상태면 새로 등장시키지 않고 남은 시간만 줄인다', () => {
        const state = createWhackAMoleState(9, 30000)
        const spawned = tick(state, 100, () => 0.3)
        const holeBefore = spawned.activeHole
        const next = tick(spawned, 100, () => 0.9) // random을 바꿔도 같은 구멍이어야 함
        expect(next.activeHole).toBe(holeBefore)
    })

    it('두더지가 제한 시간 안에 안 잡히면 점수 없이 사라진다', () => {
        const state = createWhackAMoleState(9, 30000)
        const spawned = tick(state, 100, () => 0.5)
        const expired = tick(spawned, MOLE_LIFETIME_MS + 1, () => 0.5)
        expect(expired.activeHole).toBeNull()
        expect(expired.score).toBe(0)
    })
})

describe('whack', () => {
    it('활성 두더지가 있는 구멍을 정확히 누르면 점수가 1 오르고 두더지가 사라진다', () => {
        const state = createWhackAMoleState(9, 30000)
        const spawned = tick(state, 100, () => 0.5)
        const hole = spawned.activeHole!
        const next = whack(spawned, hole)
        expect(next.score).toBe(1)
        expect(next.activeHole).toBeNull()
        expect(next.holes[hole]).toBe(false)
    })

    it('두더지가 없는 구멍을 누르면 점수가 오르지 않고 상태가 변하지 않는다', () => {
        const state = createWhackAMoleState(9, 30000)
        const spawned = tick(state, 100, () => 0.5)
        const emptyHole = spawned.holes.findIndex((_, i) => i !== spawned.activeHole)
        const next = whack(spawned, emptyHole)
        expect(next).toEqual(spawned)
    })
})

describe('tick — 게임 종료', () => {
    it('제한 시간이 다 되면 status가 over로 바뀐다', () => {
        const state = createWhackAMoleState(9, 1000)
        const next = tick(state, 1500, () => 0.5)
        expect(next.status).toBe('over')
        expect(next.timeLeftMs).toBe(0)
    })

    it('게임 종료 후에는 tick을 호출해도 상태가 바뀌지 않는다', () => {
        const state = {...createWhackAMoleState(9, 1000), status: 'over' as const}
        const next = tick(state, 100, () => 0.5)
        expect(next).toEqual(state)
    })
})
