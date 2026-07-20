export type Phase = 'work' | 'break'

export interface PomodoroState {
    phase: Phase
    remainingSec: number
    running: boolean
    workSec: number
    breakSec: number
}

export function createPomodoroState(workMinutes = 25, breakMinutes = 5): PomodoroState {
    const workSec = workMinutes * 60
    const breakSec = breakMinutes * 60
    return {phase: 'work', remainingSec: workSec, running: false, workSec, breakSec}
}

export function start(state: PomodoroState): PomodoroState {
    return {...state, running: true}
}

export function pause(state: PomodoroState): PomodoroState {
    return {...state, running: false}
}

export function reset(state: PomodoroState): PomodoroState {
    return createPomodoroState(state.workSec / 60, state.breakSec / 60)
}

// 정지 중에는 아무 변화가 없다 — 일시정지 후 재개해도 남은 시간이 절대 리셋되지 않는다는 보장의 핵심.
export function tick(state: PomodoroState): PomodoroState {
    if (!state.running) return state

    if (state.remainingSec <= 1) {
        const nextPhase: Phase = state.phase === 'work' ? 'break' : 'work'
        const nextRemaining = nextPhase === 'work' ? state.workSec : state.breakSec
        return {...state, phase: nextPhase, remainingSec: nextRemaining}
    }

    return {...state, remainingSec: state.remainingSec - 1}
}
