import {describe, expect, it} from 'vitest'
import {BOARD_HEIGHT, createCodeRainState, submitWord, tick} from './codeRainTyping'

const PACK = ['const', 'let', 'function']

describe('createCodeRainState', () => {
    it('떨어지는 단어 없이 점수 0, 라이프 가득, ready 상태로 시작한다', () => {
        const state = createCodeRainState(PACK, 3)
        expect(state.words).toEqual([])
        expect(state.score).toBe(0)
        expect(state.lives).toBe(3)
        expect(state.status).toBe('ready')
    })
})

describe('tick — 스폰', () => {
    it('스폰 간격이 지나기 전에는 새 단어가 생기지 않는다', () => {
        const state = createCodeRainState(PACK, 3, 'playing')
        const next = tick(state, 10, () => 0)
        expect(next.words).toHaveLength(0)
    })

    it('스폰 간격이 지나면 새 단어가 하나 등장한다', () => {
        const state = createCodeRainState(PACK, 3, 'playing')
        const next = tick(state, 2000, () => 0)
        expect(next.words).toHaveLength(1)
        expect(next.words[0].text).toBe(PACK[0])
        expect(next.words[0].y).toBe(0)
    })

    it('한곳에서만 떨어지지 않고, 매번 다른 무작위 x 지점에서 스폰된다', () => {
        const state = createCodeRainState(PACK, 3, 'playing')
        const first = tick(state, 2000, () => 0.1)
        const second = tick({...first, spawnRemainingMs: 0}, 0, () => 0.9)
        expect(second.words).toHaveLength(2)
        expect(second.words[0].x).not.toBe(second.words[1].x)
    })

    it('스폰 x 좌표는 가장자리에 잘리지 않도록 0%와 100% 사이 안쪽에 머문다', () => {
        const state = createCodeRainState(PACK, 3, 'playing')
        const leftEdge = tick(state, 2000, () => 0)
        const rightEdge = tick(state, 2000, () => 1)
        expect(leftEdge.words[0].x).toBeGreaterThan(0)
        expect(rightEdge.words[0].x).toBeLessThan(100)
    })
})

describe('tick — 낙하', () => {
    it('시간이 지날수록 단어의 y좌표가 증가한다', () => {
        const spawned = tick(createCodeRainState(PACK, 3, 'playing'), 2000, () => 0)
        const before = spawned.words[0].y
        const next = tick(spawned, 500, () => 1)
        expect(next.words[0].y).toBeGreaterThan(before)
    })
})

describe('tick — 라이프 감소', () => {
    it('바닥에 닿은 단어만 제거되고 라이프가 줄며, 아직 안 닿은 다른 단어는 그대로 남는다', () => {
        const state = {
            ...createCodeRainState(PACK, 3, 'playing'),
            words: [{id: 0, text: 'const', x: 50, y: BOARD_HEIGHT - 1}, {id: 1, text: 'let', x: 20, y: 50}],
            spawnRemainingMs: 999999, // 이 tick에서 새 단어가 끼어들지 않도록 스폰을 멀리 미뤄둔다
        }

        const next = tick(state, 50, () => 0.9)

        expect(next.words).toHaveLength(1)
        expect(next.words[0].text).toBe('let')
        expect(next.lives).toBe(2)
    })

    it('라이프가 0이 되면 status가 over로 바뀐다', () => {
        let state = createCodeRainState(PACK, 1, 'playing')
        state = {...state, words: [{id: 0, text: 'const', x: 50, y: BOARD_HEIGHT - 1}]}
        const next = tick(state, 100, () => 0)
        expect(next.lives).toBe(0)
        expect(next.status).toBe('over')
    })

    it('게임 종료 후에는 tick을 호출해도 상태가 바뀌지 않는다', () => {
        const state = {...createCodeRainState(PACK, 1), status: 'over' as const}
        const next = tick(state, 500, () => 0)
        expect(next).toEqual(state)
    })
})

describe('submitWord', () => {
    it('입력이 떨어지는 단어 중 하나와 정확히 일치하면 그 단어만 사라지고 점수가 1 오른다', () => {
        const state = {
            ...createCodeRainState(PACK, 3, 'playing'),
            words: [{id: 0, text: 'const', x: 50, y: 10}, {id: 1, text: 'let', x: 30, y: 20}],
        }
        const next = submitWord(state, 'const')
        expect(next.score).toBe(1)
        expect(next.words).toHaveLength(1)
        expect(next.words[0].text).toBe('let')
    })

    it('대소문자 구별 없이 입력을 허용한다', () => {
        const state = {
            ...createCodeRainState(PACK, 3, 'playing'),
            words: [{id: 0, text: 'Const', x: 50, y: 10}],
        }
        const next = submitWord(state, 'const')
        expect(next.score).toBe(1)
        expect(next.words).toHaveLength(0)
    })

    it('일치하는 단어가 없으면 점수도 단어 목록도 바뀌지 않는다', () => {
        const state = {
            ...createCodeRainState(PACK, 3, 'playing'),
            words: [{id: 0, text: 'const', x: 50, y: 10}],
        }
        const next = submitWord(state, 'unknown')
        expect(next).toEqual(state)
    })

    it('게임 종료 후에는 입력해도 상태가 바뀌지 않는다', () => {
        const state = {
            ...createCodeRainState(PACK, 3, 'playing'),
            words: [{id: 0, text: 'const', x: 50, y: 10}],
            status: 'over' as const,
        }
        const next = submitWord(state, 'const')
        expect(next).toEqual(state)
    })
})
