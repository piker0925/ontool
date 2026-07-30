import {describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import TugOfWarBoard from './TugOfWarBoard.vue'

describe('TugOfWarGame', () => {
    it('초기 마운트 시 10초 연타 배틀 보드가 표시된다', () => {
        const wrapper = mount(TugOfWarBoard)
        expect(wrapper.find('[data-testid="tug-board"]').exists()).toBe(true)
        expect(wrapper.find('[data-testid="tug-timer"]').exists()).toBe(true)
    })
})
