import {describe, expect, it, vi} from 'vitest'
import {mount} from '@vue/test-utils'
import TicTacToeGame from './TicTacToeGame.vue'

describe('TicTacToeGame — 재시작', () => {
    it('몇 수를 둔 뒤 다시 시작하면 보드가 빈 상태로 되돌아간다', async () => {
        vi.useFakeTimers()
        try {
            const wrapper = mount(TicTacToeGame)
            const cells = wrapper.findAll('[data-testid="board"] > button')

            await cells[0].trigger('click')
            await vi.advanceTimersByTimeAsync(500) // 컴퓨터 수까지 진행

            const filledBefore = wrapper.findAll('[data-testid="board"] > button').filter(c => c.text() !== '').length
            expect(filledBefore).toBe(2) // 사람 1수 + 컴퓨터 1수

            await wrapper.find('[data-testid="game-restart"]').trigger('click')

            const filledAfter = wrapper.findAll('[data-testid="board"] > button').filter(c => c.text() !== '').length
            expect(filledAfter).toBe(0)
        } finally {
            vi.useRealTimers()
        }
    })
})
