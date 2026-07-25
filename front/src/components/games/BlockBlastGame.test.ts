import {describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import BlockBlastGame from './BlockBlastGame.vue'

describe('BlockBlastGame', () => {
    it('선택된 조각으로 빈 칸을 클릭하면 그 칸이 채워진다(모든 조각이 기준점 (0,0)을 포함)', async () => {
        const wrapper = mount(BlockBlastGame)
        const cell = wrapper.find('[data-testid="cell-2-2"]')
        expect(cell.classes()).not.toContain('bg-zone-accent')

        await cell.trigger('click')
        expect(wrapper.find('[data-testid="cell-2-2"]').classes()).toContain('bg-zone-accent')
    })

    it('처음엔 격자가 8x8이고 조각 트레이가 3개다', () => {
        const wrapper = mount(BlockBlastGame)
        expect(wrapper.findAll('[data-testid^="cell-"]').length).toBe(64)
        expect(wrapper.findAll('[data-testid^="piece-"]').length).toBe(3)
    })
})
