import {describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import OmokGame from './OmokGame.vue'

describe('OmokGame', () => {
    it('초기 마운트 시 15x15 오목 바둑판이 렌더링된다', () => {
        const wrapper = mount(OmokGame)
        expect(wrapper.find('[data-testid="omok-board"]').exists()).toBe(true)
        expect(wrapper.find('[data-testid="omok-mode-toggle"]').exists()).toBe(true)
    })

    it('셀을 클릭하면 해당 자리에 바둑돌이 둘어진다', async () => {
        const wrapper = mount(OmokGame)
        const cell = wrapper.find('[data-testid="cell-7-7"]')
        await cell.trigger('click')

        expect(cell.find('.rounded-full').exists()).toBe(true)
    })
})
