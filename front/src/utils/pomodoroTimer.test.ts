import {describe, expect, it} from 'vitest'
import {createPomodoroState, pause, reset, start, tick} from './pomodoroTimer'

describe('createPomodoroState', () => {
    it('기본값(25/5분) work 단계로 시작하고, 정지 상태다', () => {
        const state = createPomodoroState()
        expect(state.phase).toBe('work')
        expect(state.remainingSec).toBe(25 * 60)
        expect(state.running).toBe(false)
    })

    it('작업/휴식 시간을 분 단위로 조정할 수 있다', () => {
        const state = createPomodoroState(10, 2)
        expect(state.remainingSec).toBe(10 * 60)
        expect(state.workSec).toBe(10 * 60)
        expect(state.breakSec).toBe(2 * 60)
    })
})

describe('tick', () => {
    it('실행 중이 아니면 남은 시간이 전혀 줄지 않는다', () => {
        const state = createPomodoroState(10, 2) // running: false
        const next = tick(state)
        expect(next.remainingSec).toBe(state.remainingSec)
    })

    it('실행 중이면 1초씩 줄어든다', () => {
        const state = start(createPomodoroState(10, 2))
        const next = tick(state)
        expect(next.remainingSec).toBe(state.remainingSec - 1)
    })

    it('작업 시간이 끝나면 자동으로 휴식 단계로 전환되고 휴식 시간으로 채워진다', () => {
        let state = start(createPomodoroState(10, 2))
        state = {...state, remainingSec: 1}
        const next = tick(state)
        expect(next.phase).toBe('break')
        expect(next.remainingSec).toBe(2 * 60)
        expect(next.running).toBe(true) // 전환되어도 계속 실행 중이어야 자연스럽게 이어짐
    })

    it('휴식 시간이 끝나면 다시 작업 단계로 전환된다', () => {
        let state = start(createPomodoroState(10, 2))
        state = {...state, phase: 'break', remainingSec: 1}
        const next = tick(state)
        expect(next.phase).toBe('work')
        expect(next.remainingSec).toBe(10 * 60)
    })
})

describe('일시정지 후 재개 — 남은 시간 유지', () => {
    it('일시정지했다가 재개해도 남은 시간이 리셋되지 않고 정확히 이어진다', () => {
        let state = start(createPomodoroState(10, 2))
        state = tick(state) // 599초
        state = tick(state) // 598초
        const remainingBeforePause = state.remainingSec

        state = pause(state)
        // 정지 중에는 여러 번 tick이 와도 전혀 변하지 않는다
        state = tick(state)
        state = tick(state)
        expect(state.remainingSec).toBe(remainingBeforePause)

        state = start(state) // 재개 — 599초 등 처음으로 리셋되면 안 됨
        expect(state.remainingSec).toBe(remainingBeforePause)

        state = tick(state)
        expect(state.remainingSec).toBe(remainingBeforePause - 1)
    })
})

describe('reset', () => {
    it('진행 중이던 시간을 버리고 작업 단계 초기 상태로 되돌린다', () => {
        let state = start(createPomodoroState(10, 2))
        state = tick(state)
        state = {...state, phase: 'break', remainingSec: 30}

        const next = reset(state)
        expect(next.phase).toBe('work')
        expect(next.remainingSec).toBe(10 * 60)
        expect(next.running).toBe(false)
    })
})
