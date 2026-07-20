import {describe, expect, it} from 'vitest'
import {createMemoryGame, flipCard, resolveFlip} from './memoryCards'

describe('createMemoryGame', () => {
    it('pairCount만큼의 값이 각각 정확히 2번씩 나타나는 카드 목록을 만든다', () => {
        const state = createMemoryGame(6, () => 0.5)
        expect(state.cards.length).toBe(12)
        const counts = new Map<number, number>()
        for (const c of state.cards) counts.set(c.value, (counts.get(c.value) ?? 0) + 1)
        expect([...counts.values()]).toEqual(Array(6).fill(2))
    })

    it('random 함수가 다르면 카드 배치도 달라진다', () => {
        const a = createMemoryGame(8, () => 0.1)
        const b = createMemoryGame(8, () => 0.9)
        expect(a.cards.map(c => c.value)).not.toEqual(b.cards.map(c => c.value))
    })
})

describe('flipCard', () => {
    it('카드를 뒤집으면 flippedIds에 추가된다', () => {
        const state = createMemoryGame(4, () => 0.5)
        const next = flipCard(state, state.cards[0].id)
        expect(next.flippedIds).toEqual([state.cards[0].id])
    })

    it('같은 카드를 두 번 뒤집을 수 없다', () => {
        const state = createMemoryGame(4, () => 0.5)
        const once = flipCard(state, state.cards[0].id)
        const twice = flipCard(once, state.cards[0].id)
        expect(twice.flippedIds).toEqual([state.cards[0].id])
    })

    it('이미 2장이 뒤집혀 판정 대기 중이면 세 번째 카드는 뒤집히지 않는다', () => {
        const state = createMemoryGame(4, () => 0.5)
        const [a, b, c] = state.cards
        let next = flipCard(state, a.id)
        next = flipCard(next, b.id)
        next = flipCard(next, c.id)
        expect(next.flippedIds).toEqual([a.id, b.id])
    })

    it('이미 맞춘(matched) 카드는 다시 뒤집히지 않는다', () => {
        const state = createMemoryGame(4, () => 0.5)
        const matchingPair = findMatchingPair(state)
        let next = flipCard(state, matchingPair[0].id)
        next = flipCard(next, matchingPair[1].id)
        next = resolveFlip(next)
        expect(next.cards.find(c => c.id === matchingPair[0].id)?.matched).toBe(true)

        const reflipped = flipCard(next, matchingPair[0].id)
        expect(reflipped.flippedIds).toEqual([])
    })
})

describe('resolveFlip', () => {
    it('두 카드의 값이 같으면 둘 다 matched가 되고 flippedIds가 비워진다', () => {
        const state = createMemoryGame(4, () => 0.5)
        const [a, b] = findMatchingPair(state)
        let next = flipCard(state, a.id)
        next = flipCard(next, b.id)
        next = resolveFlip(next)

        expect(next.cards.find(c => c.id === a.id)?.matched).toBe(true)
        expect(next.cards.find(c => c.id === b.id)?.matched).toBe(true)
        expect(next.flippedIds).toEqual([])
    })

    it('두 카드의 값이 다르면 다시 뒤집히고(matched=false) flippedIds가 비워진다', () => {
        const state = createMemoryGame(4, () => 0.5)
        const [a, b] = findNonMatchingPair(state)
        let next = flipCard(state, a.id)
        next = flipCard(next, b.id)
        next = resolveFlip(next)

        expect(next.cards.find(c => c.id === a.id)?.matched).toBe(false)
        expect(next.cards.find(c => c.id === b.id)?.matched).toBe(false)
        expect(next.flippedIds).toEqual([])
    })

    it('카드가 1장만 뒤집혀 있으면(판정 대기 아님) 아무 변화가 없다', () => {
        const state = createMemoryGame(4, () => 0.5)
        const next = flipCard(state, state.cards[0].id)
        const resolved = resolveFlip(next)
        expect(resolved).toEqual(next)
    })

    it('모든 쌍을 맞추면 상태가 won이 된다', () => {
        let state = createMemoryGame(2, () => 0.5) // 카드 4장 = 2쌍
        while (state.status !== 'won') {
            const pair = findMatchingPair(state)
            state = flipCard(state, pair[0].id)
            state = flipCard(state, pair[1].id)
            state = resolveFlip(state)
        }
        expect(state.status).toBe('won')
        expect(state.cards.every(c => c.matched)).toBe(true)
    })
})

function findMatchingPair(state: ReturnType<typeof createMemoryGame>) {
    const unmatched = state.cards.filter(c => !c.matched)
    for (const c of unmatched) {
        const partner = unmatched.find(o => o.id !== c.id && o.value === c.value)
        if (partner) return [c, partner] as const
    }
    throw new Error('no matching pair left')
}

function findNonMatchingPair(state: ReturnType<typeof createMemoryGame>) {
    const unmatched = state.cards.filter(c => !c.matched)
    for (const c of unmatched) {
        const other = unmatched.find(o => o.id !== c.id && o.value !== c.value)
        if (other) return [c, other] as const
    }
    throw new Error('no non-matching pair available')
}
