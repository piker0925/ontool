import {describe, expect, it} from 'vitest'
import {createSimonGame, press} from './simon'

describe('createSimonGame', () => {
    it('길이 1짜리 시퀀스로 시작하고 입력은 비어 있다', () => {
        const state = createSimonGame(() => 0)
        expect(state.sequence.length).toBe(1)
        expect(state.playerInput).toEqual([])
        expect(state.status).toBe('playing')
        expect(state.round).toBe(1)
    })
})

describe('press — 정답 시퀀스', () => {
    it('현재 라운드의 색을 순서대로 다 맞히면 다음 라운드로(길이 +1) 진행되고 입력이 초기화된다', () => {
        const state = createSimonGame(() => 0) // sequence: [0]
        const next = press(state, 0, () => 0.99) // 새로 추가되는 색은 index 3
        expect(next.status).toBe('playing')
        expect(next.sequence).toEqual([0, 3])
        expect(next.playerInput).toEqual([])
        expect(next.round).toBe(2)
    })

    it('시퀀스가 길어져도 중간 입력까지는 게임오버 없이 progress만 쌓인다', () => {
        // sequence를 수동 구성: [0, 1, 2] 상태에서 첫 두 개를 맞히는 과정을 검증
        let state = createSimonGame(() => 0) // [0]
        state = press(state, 0, () => 1 / 3) // 다음 색 = floor(1/3*4)=1 → [0,1], round 2
        expect(state.sequence).toEqual([0, 1])

        state = press(state, 0, () => 0) // 1번째 입력 정답(0) — 아직 라운드 안 끝남
        expect(state.status).toBe('playing')
        expect(state.playerInput).toEqual([0])

        state = press(state, 1, () => 0.6) // 2번째 입력 정답(1) — 라운드 완료, 새 색 추가
        expect(state.status).toBe('playing')
        expect(state.playerInput).toEqual([])
        expect(state.sequence.length).toBe(3)
    })
})

describe('press — 오답', () => {
    it('첫 번째 입력부터 틀리면 즉시 게임 오버가 된다', () => {
        const state = createSimonGame(() => 0) // sequence: [0]
        const next = press(state, 1) // 정답은 0인데 1을 누름
        expect(next.status).toBe('over')
    })

    it('시퀀스 중간에서 틀리면 마지막 입력만 보는 게 아니라 그 위치에서 즉시 게임 오버가 된다', () => {
        let state = createSimonGame(() => 0) // [0]
        state = press(state, 0, () => 1 / 3) // [0,1], round 2
        expect(state.sequence).toEqual([0, 1])

        // 1번째 입력은 정답(0)이지만 2번째 입력에서 실수(정답은 1인데 2를 누름)
        state = press(state, 0)
        expect(state.status).toBe('playing')
        const failed = press(state, 2)
        expect(failed.status).toBe('over')
    })

    it('게임 오버 상태에서 다시 눌러도 상태가 바뀌지 않는다', () => {
        const state = createSimonGame(() => 0)
        const over = press(state, 1) // 오답 → over
        const again = press(over, 0)
        expect(again).toEqual(over)
    })
})
