import {describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import GridTurfWarGame from './GridTurfWarGame.vue'

describe('GridTurfWarGame', () => {
    it('초기 마운트 시 2D 영토전 보드가 표시된다', () => {
        const wrapper = mount(GridTurfWarGame)
        expect(wrapper.find('[data-testid="turf-board"]').exists()).toBe(true)
        expect(wrapper.find('[data-testid="turf-time"]').exists()).toBe(true)
    })
})
