import {describe, expect, it} from 'vitest'
import {
    createSimonGame,
    getSequenceLengthForRound,
    getSimonTiming,
    press,
    SIMON_BASE_GAP_MS,
    SIMON_BASE_SHOW_MS,
    SIMON_COLOR_COUNT,
} from './simon'

describe('createSimonGame', () => {
    it('길이 1짜리 시퀀스로 시작하고 입력은 비어 있다', () => {
        const state = createSimonGame(() => 0, 4)
        expect(state.sequence.length).toBe(1)
        expect(state.playerInput).toEqual([])
        expect(state.status).toBe('playing')
        expect(state.round).toBe(1)
    })
})

describe('createSimonGame — 색 개수 파라미터화', () => {
    it('colorCount를 지정하지 않으면 기본 팔레트 크기(9)를 사용한다', () => {
        const state = createSimonGame(() => 0.99)
        expect(state.colorCount).toBe(SIMON_COLOR_COUNT)
        expect(SIMON_COLOR_COUNT).toBe(9)
        expect(state.sequence[0]).toBe(8) // floor(0.99 * 9)
    })

    it('colorCount를 4로 명시하면 생성되는 색이 0~3 범위로 좁아진다', () => {
        const state = createSimonGame(() => 0.99, 4)
        expect(state.colorCount).toBe(4)
        expect(state.sequence[0]).toBe(3) // floor(0.99 * 4)
    })

    it('press로 다음 라운드에 추가되는 색도 생성 시 지정한 colorCount를 벗어나지 않는다', () => {
        // colorCount 9는 라운드 1→2 구간이 완화 스케줄(172)이라 길이가 늘지 않는다.
        // 실제로 길이가 느는 라운드(2→3)까지 진행해서 새로 뽑힌 색이 colorCount 범위 안인지 확인한다.
        let state9 = createSimonGame(() => 0, 9) // sequence: [0], colorCount 9, round 1
        state9 = press(state9, 0, () => 0.99) // round 2, 완화 구간이라 길이 유지 [0]
        const next9 = press(state9, 0, () => 0.99) // round 3, 길이 증가 — 새 색 = floor(0.99*9) = 8
        expect(next9.sequence).toEqual([0, 8])
        expect(next9.colorCount).toBe(9)

        const state4 = createSimonGame(() => 0, 4) // sequence: [0], colorCount 4
        const next4 = press(state4, 0, () => 0.99) // 새 색 = floor(0.99*4) = 3
        expect(next4.sequence).toEqual([0, 3])
        expect(next4.colorCount).toBe(4)
    })
})

describe('press — 정답 시퀀스', () => {
    it('현재 라운드의 색을 순서대로 다 맞히면 다음 라운드로(길이 +1) 진행되고 입력이 초기화된다', () => {
        const state = createSimonGame(() => 0, 4) // sequence: [0]
        const next = press(state, 0, () => 0.99) // 새로 추가되는 색은 index 3
        expect(next.status).toBe('playing')
        expect(next.sequence).toEqual([0, 3])
        expect(next.playerInput).toEqual([])
        expect(next.round).toBe(2)
    })

    it('시퀀스가 길어져도 중간 입력까지는 게임오버 없이 progress만 쌓인다', () => {
        // sequence를 수동 구성: [0, 1, 2] 상태에서 첫 두 개를 맞히는 과정을 검증
        let state = createSimonGame(() => 0, 4) // [0]
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
        const state = createSimonGame(() => 0, 4) // sequence: [0]
        const next = press(state, 1) // 정답은 0인데 1을 누름
        expect(next.status).toBe('over')
    })

    it('시퀀스 중간에서 틀리면 마지막 입력만 보는 게 아니라 그 위치에서 즉시 게임 오버가 된다', () => {
        let state = createSimonGame(() => 0, 4) // [0]
        state = press(state, 0, () => 1 / 3) // [0,1], round 2
        expect(state.sequence).toEqual([0, 1])

        // 1번째 입력은 정답(0)이지만 2번째 입력에서 실수(정답은 1인데 2를 누름)
        state = press(state, 0)
        expect(state.status).toBe('playing')
        const failed = press(state, 2)
        expect(failed.status).toBe('over')
    })

    it('게임 오버 상태에서 다시 눌러도 상태가 바뀌지 않는다', () => {
        const state = createSimonGame(() => 0, 4)
        const over = press(state, 1) // 오답 → over
        const again = press(over, 0)
        expect(again).toEqual(over)
    })
})

describe('getSimonTiming — 라운드별 재생 속도 스케줄', () => {
    it('1라운드는 기본 속도(SHOW_MS/GAP_MS)보다 눈에 띄게 느리다', () => {
        const timing = getSimonTiming(1)
        expect(timing.showMs).toBeGreaterThan(SIMON_BASE_SHOW_MS)
        expect(timing.gapMs).toBeGreaterThan(SIMON_BASE_GAP_MS)
    })

    it('라운드가 진행될수록 showMs/gapMs가 단조 감소하다가 기본 속도에 도달한다 (최소 3개 라운드 비교)', () => {
        const r1 = getSimonTiming(1)
        const r2 = getSimonTiming(2)
        const r3 = getSimonTiming(3)

        expect(r2.showMs).toBeLessThan(r1.showMs)
        expect(r3.showMs).toBeLessThan(r2.showMs)
        expect(r2.gapMs).toBeLessThanOrEqual(r1.gapMs)
        expect(r3.gapMs).toBeLessThanOrEqual(r2.gapMs)
    })

    it('램프 구간이 끝난 라운드부터는 기본 속도로 고정되고 그 이상 빨라지지 않는다', () => {
        const atBase = getSimonTiming(6)
        const wayLater = getSimonTiming(50)

        expect(atBase).toEqual({showMs: SIMON_BASE_SHOW_MS, gapMs: SIMON_BASE_GAP_MS})
        expect(wayLater).toEqual(atBase)
    })

    it('0 이하의 라운드 값은 1라운드와 동일하게 취급한다(방어적 clamp)', () => {
        expect(getSimonTiming(0)).toEqual(getSimonTiming(1))
        expect(getSimonTiming(-5)).toEqual(getSimonTiming(1))
    })
})

describe('getSequenceLengthForRound — 라운드별 시퀀스 길이 증가 스케줄(172)', () => {
    it('4색 이하(구버전 호환)는 기존과 동일하게 매 라운드 정확히 1개씩 늘어난다', () => {
        for (let round = 1; round <= 10; round++) {
            expect(getSequenceLengthForRound(round, 4)).toBe(round)
        }
    })

    it('9색(현재 기본값)은 초반 라운드에서 2라운드에 1개씩만 늘어 4색보다 완만하다', () => {
        // 같은 라운드 수를 클리어했을 때 9색 쪽 시퀀스가 4색 쪽보다 짧아야(=쉬워야) 한다
        expect(getSequenceLengthForRound(2, 9)).toBeLessThan(getSequenceLengthForRound(2, 4))
        expect(getSequenceLengthForRound(4, 9)).toBeLessThan(getSequenceLengthForRound(4, 4))
        expect(getSequenceLengthForRound(6, 9)).toBeLessThan(getSequenceLengthForRound(6, 4))

        // 구체적으로 라운드 1~6 동안 2라운드당 1개씩만 증가한다
        expect(getSequenceLengthForRound(1, 9)).toBe(1)
        expect(getSequenceLengthForRound(2, 9)).toBe(1)
        expect(getSequenceLengthForRound(3, 9)).toBe(2)
        expect(getSequenceLengthForRound(4, 9)).toBe(2)
        expect(getSequenceLengthForRound(5, 9)).toBe(3)
        expect(getSequenceLengthForRound(6, 9)).toBe(3)
    })

    it('완화 구간이 끝난 이후(9색)에는 다시 매 라운드 1개씩 정상 속도로 늘어난다', () => {
        const r6 = getSequenceLengthForRound(6, 9)
        const r7 = getSequenceLengthForRound(7, 9)
        const r8 = getSequenceLengthForRound(8, 9)
        const r9 = getSequenceLengthForRound(9, 9)

        expect(r7 - r6).toBe(1)
        expect(r8 - r7).toBe(1)
        expect(r9 - r8).toBe(1)
    })

    it('시퀀스 길이는 라운드에 대해 단조 비감소(never decreasing)한다', () => {
        let prev = getSequenceLengthForRound(1, 9)
        for (let round = 2; round <= 15; round++) {
            const current = getSequenceLengthForRound(round, 9)
            expect(current).toBeGreaterThanOrEqual(prev)
            prev = current
        }
    })

    it('0 이하의 라운드 값은 1라운드와 동일하게 취급한다(방어적 clamp)', () => {
        expect(getSequenceLengthForRound(0, 9)).toBe(getSequenceLengthForRound(1, 9))
        expect(getSequenceLengthForRound(-3, 9)).toBe(getSequenceLengthForRound(1, 9))
    })
})

describe('press — 9색 기준 완화된 성장 스케줄이 실제로 적용된다', () => {
    it('완화 구간(2라운드) 안에서는 라운드를 클리어해도 시퀀스 길이가 늘지 않을 수 있다', () => {
        // colorCount=9, round 1 → round 2로 넘어가는 구간은 완화 구간(길이 1 유지)
        const state = createSimonGame(() => 0, 9) // sequence: [0], round 1
        const next = press(state, 0, () => 0.5) // round 2로 진행 시도
        expect(next.status).toBe('playing')
        expect(next.round).toBe(2)
        expect(next.sequence.length).toBe(1) // 완화 구간이라 길이 유지
        expect(next.sequence).toEqual([0])
    })

    it('완화 구간을 넘어서면(라운드 3) 시퀀스 길이가 늘어난다', () => {
        let state = createSimonGame(() => 0, 9) // [0], round 1
        state = press(state, 0, () => 0.5) // round 2, 길이 유지 [0]
        expect(state.sequence.length).toBe(1)

        state = press(state, 0, () => 0.5) // round 3, 길이 증가
        expect(state.status).toBe('playing')
        expect(state.round).toBe(3)
        expect(state.sequence.length).toBe(2)
    })

    it('4색으로 플레이하면(구버전 호환) 완화 없이 매 라운드 길이가 늘어난다', () => {
        const state = createSimonGame(() => 0, 4) // [0], round 1
        const next = press(state, 0, () => 0.5)
        expect(next.round).toBe(2)
        expect(next.sequence.length).toBe(2)
    })
})
