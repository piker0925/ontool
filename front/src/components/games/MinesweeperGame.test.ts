import {describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import MinesweeperGame from './MinesweeperGame.vue'

describe('MinesweeperGame — 재시작', () => {
    it('다시 시작 버튼을 누르면 열린 칸이 모두 닫힌 새 보드로 돌아간다', async () => {
        const wrapper = mount(MinesweeperGame)

        // 여러 칸을 열어 상태를 초기값에서 벗어나게 만든다.
        const cells = wrapper.findAll('[data-testid="board"] > button')
        for (const cell of cells.slice(0, 10)) {
            await cell.trigger('click')
        }
        const revealedBefore = wrapper.findAll('[data-testid="board"] > button')
            .filter(c => c.text() !== '').length
        expect(revealedBefore).toBeGreaterThan(0)

        await wrapper.find('[data-testid="game-restart"]').trigger('click')

        const revealedAfter = wrapper.findAll('[data-testid="board"] > button')
            .filter(c => c.text() !== '').length
        expect(revealedAfter).toBe(0)
    })
})
