import {describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import WaterSortGame from './WaterSortGame.vue'

describe('WaterSortGame', () => {
    it('7개의 시험관(색상 5 + 빈 시험관 2)을 렌더링한다', () => {
        const wrapper = mount(WaterSortGame)
        const tubeButtons = wrapper.findAll('button[data-testid^="tube-"]')
        expect(tubeButtons.length).toBe(7)
    })

    it('시험관을 선택한 뒤 같은 시험관을 다시 누르면 선택이 취소되고 이동 횟수가 늘지 않는다', async () => {
        const wrapper = mount(WaterSortGame)
        await wrapper.find('[data-testid="tube-0"]').trigger('click')
        await wrapper.find('[data-testid="tube-0"]').trigger('click')
        expect(wrapper.find('[data-testid="move-count"]').text()).toBe('0')
    })

    it('채워진 시험관을 선택해 빈 시험관에 부으면 이동 횟수가 오르고 내용물이 옮겨진다', async () => {
        const wrapper = mount(WaterSortGame)
        // 색상 시험관(0)은 항상 채워져 있고, 마지막 두 시험관(5, 6)은 항상 비어 시작한다 —
        // 채워진 곳 → 빈 곳으로의 이동은 색과 무관하게 항상 유효하다.
        await wrapper.find('[data-testid="tube-0"]').trigger('click')
        await wrapper.find('[data-testid="tube-5"]').trigger('click')

        expect(wrapper.find('[data-testid="move-count"]').text()).toBe('1')
        expect(wrapper.find('[data-testid="tube-5-layer-0"]').exists()).toBe(true)
    })
})
