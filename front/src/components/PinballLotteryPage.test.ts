import {describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import PinballLotteryPage from './PinballLotteryPage.vue'

describe('PinballLotteryPage', () => {
    it('초기 마운트 시 핀볼 보드가 표시된다', () => {
        const wrapper = mount(PinballLotteryPage)
        expect(wrapper.find('[data-testid="pinball-board"]').exists()).toBe(true)
    })
})
