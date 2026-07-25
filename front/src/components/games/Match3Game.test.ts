import {describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import Match3Game from './Match3Game.vue'

describe('Match3Game', () => {
    it('8x8 격자(64칸)를 렌더링한다', () => {
        const wrapper = mount(Match3Game)
        expect(wrapper.findAll('[data-testid^="tile-"]').length).toBe(64)
    })

    it('타일을 클릭하면 선택 표시가 되고, 같은 타일을 다시 클릭하면 선택이 풀린다', async () => {
        const wrapper = mount(Match3Game)
        const tile = wrapper.find('[data-testid="tile-0-0"]')
        await tile.trigger('click')
        expect(wrapper.find('[data-testid="tile-0-0"]').classes()).toContain('ring-2')

        await wrapper.find('[data-testid="tile-0-0"]').trigger('click')
        expect(wrapper.find('[data-testid="tile-0-0"]').classes()).not.toContain('ring-2')
    })

    it('타일을 선택한 뒤 인접한 타일을 클릭하면(매치 성공 여부와 무관하게) 선택이 해제된다', async () => {
        const wrapper = mount(Match3Game)
        await wrapper.find('[data-testid="tile-0-0"]').trigger('click')
        await wrapper.find('[data-testid="tile-0-1"]').trigger('click')

        expect(wrapper.find('[data-testid="tile-0-0"]').classes()).not.toContain('ring-2')
        expect(wrapper.find('[data-testid="tile-0-1"]').classes()).not.toContain('ring-2')
    })
})
