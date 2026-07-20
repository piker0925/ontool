export type ReactionPhase = 'idle' | 'waiting' | 'ready' | 'result' | 'false-start'

export interface ReactionState {
    phase: ReactionPhase
    signalAt: number | null
    elapsedMs: number | null
}

export function handleReactionClick(state: ReactionState, clickedAt: number): ReactionState {
    if (state.phase === 'waiting') {
        return {phase: 'false-start', signalAt: null, elapsedMs: null}
    }
    if (state.phase === 'ready' && state.signalAt !== null) {
        return {phase: 'result', signalAt: state.signalAt, elapsedMs: clickedAt - state.signalAt}
    }
    return state
}
