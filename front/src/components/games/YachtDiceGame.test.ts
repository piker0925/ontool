import {describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import YachtDiceGame from './YachtDiceGame.vue'

describe('YachtDiceGame', () => {
    it('초기 마운트 시 요트 다이스 주사위 보드가 표시된다', () => {
        const wrapper = mount(YachtDiceGame)
        expect(wrapper.find('[data-testid="yacht-board"]').exists()).toBe(true)
        expect(wrapper.find('[data-testid="yacht-score"]').exists()).toBe(true)
    })
})
