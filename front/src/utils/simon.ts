export const SIMON_COLOR_COUNT = 4

export interface SimonState {
    sequence: number[]
    playerInput: number[]
    round: number
    status: 'playing' | 'over'
}

function randomColor(random: () => number): number {
    return Math.floor(random() * SIMON_COLOR_COUNT)
}

export function createSimonGame(random: () => number = Math.random): SimonState {
    return {sequence: [randomColor(random)], playerInput: [], round: 1, status: 'playing'}
}

export function press(state: SimonState, color: number, random: () => number = Math.random): SimonState {
    if (state.status !== 'playing') return state

    const index = state.playerInput.length
    if (state.sequence[index] !== color) {
        return {...state, status: 'over'}
    }

    const playerInput = [...state.playerInput, color]
    if (playerInput.length < state.sequence.length) {
        return {...state, playerInput}
    }

    // 전체 시퀀스를 다 맞혔다 — 다음 라운드로 진행
    const sequence = [...state.sequence, randomColor(random)]
    return {sequence, playerInput: [], round: sequence.length, status: 'playing'}
}
