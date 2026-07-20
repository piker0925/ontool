export interface MemoryCard {
    id: number
    value: number
    matched: boolean
}

export interface MemoryGameState {
    cards: MemoryCard[]
    flippedIds: number[]
    status: 'playing' | 'won'
}

export function createMemoryGame(pairCount: number, random: () => number = Math.random): MemoryGameState {
    const values = Array.from({length: pairCount}, (_, i) => i).flatMap(v => [v, v])
    // Fisher-Yates 셔플
    for (let i = values.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1))
        ;[values[i], values[j]] = [values[j], values[i]]
    }
    const cards = values.map((value, id) => ({id, value, matched: false}))
    return {cards, flippedIds: [], status: 'playing'}
}

export function flipCard(state: MemoryGameState, id: number): MemoryGameState {
    if (state.flippedIds.length >= 2) return state
    if (state.flippedIds.includes(id)) return state
    const card = state.cards.find(c => c.id === id)
    if (!card || card.matched) return state
    return {...state, flippedIds: [...state.flippedIds, id]}
}

export function resolveFlip(state: MemoryGameState): MemoryGameState {
    if (state.flippedIds.length !== 2) return state
    const [aId, bId] = state.flippedIds
    const a = state.cards.find(c => c.id === aId)!
    const b = state.cards.find(c => c.id === bId)!
    const isMatch = a.value === b.value

    const cards = isMatch
        ? state.cards.map(c => (c.id === aId || c.id === bId) ? {...c, matched: true} : c)
        : state.cards

    const status = cards.every(c => c.matched) ? 'won' : 'playing'
    return {cards, flippedIds: [], status}
}
