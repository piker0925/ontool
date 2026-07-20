import {describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import MemoryCardsGame from './MemoryCardsGame.vue'

describe('MemoryCardsGame — 재시작', () => {
    it('카드를 뒤집은 뒤 다시 시작하면 전부 닫힌 새 보드로 돌아간다', async () => {
        const wrapper = mount(MemoryCardsGame)
        const cards = wrapper.findAll('[data-testid="board"] > button')

        await cards[0].trigger('click')
        expect(cards[0].text()).not.toBe('')

        await wrapper.find('[data-testid="game-restart"]').trigger('click')

        const cardsAfter = wrapper.findAll('[data-testid="board"] > button')
        expect(cardsAfter.every(c => c.text() === '')).toBe(true)
    })
})
