// 10Hz High-Frequency Mash Speed Battle Engine

export type TugStatus = 'ready' | 'playing' | 'over'

export interface TugState {
    ropePosition: number // -100 (Team A Win) ~ +100 (Team B Win)
    teamAPulls: number
    teamBPulls: number
    timeLeftMs: number
    winnerTeam: 'A' | 'B' | 'DRAW' | null
    status: TugStatus
    cps: number
    lastPullTimes: number[]
}

export function createTugState(initialStatus: TugStatus = 'ready'): TugState {
    return {
        ropePosition: 0,
        teamAPulls: 0,
        teamBPulls: 0,
        timeLeftMs: 10000,
        winnerTeam: null,
        status: initialStatus,
        cps: 0,
        lastPullTimes: []
    }
}

export function startTugGame(state: TugState): TugState {
    return {
        ...state,
        status: 'playing'
    }
}

export function pullRope(state: TugState, team: 'A' | 'B', _nowMs: number = Date.now()): TugState {
    if (state.status !== 'playing') return state
    const delta = team === 'A' ? -3 : 3
    const ropePosition = Math.max(-100, Math.min(100, state.ropePosition + delta))
    const teamAPulls = team === 'A' ? state.teamAPulls + 1 : state.teamAPulls
    const teamBPulls = team === 'B' ? state.teamBPulls + 1 : state.teamBPulls
    
    const elapsedSec = Math.max(0.2, (10000 - state.timeLeftMs) / 1000)
    const cps = Math.round((teamAPulls / elapsedSec) * 10) / 10

    return {
        ...state,
        ropePosition,
        teamAPulls,
        teamBPulls,
        cps
    }
}

export function tickTug(state: TugState, deltaMs: number): { nextState: TugState } {
    if (state.status !== 'playing') return { nextState: state }

    const timeLeftMs = Math.max(0, state.timeLeftMs - deltaMs)
    let status: TugStatus = state.status
    let winnerTeam = state.winnerTeam

    if (timeLeftMs <= 0 || Math.abs(state.ropePosition) >= 100) {
        status = 'over'
        if (state.teamAPulls > state.teamBPulls || state.ropePosition < 0) winnerTeam = 'A'
        else if (state.teamBPulls > state.teamAPulls || state.ropePosition > 0) winnerTeam = 'B'
        else winnerTeam = 'DRAW'
    }

    return {
        nextState: {
            ...state,
            timeLeftMs,
            winnerTeam,
            status
        }
    }
}
