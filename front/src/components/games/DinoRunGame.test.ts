import {describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import DinoRunGame from './DinoRunGame.vue'

describe('DinoRunGame', () => {
    it('초기 마운트 시 2D 공룡 트랙 보드가 표시된다', () => {
        const wrapper = mount(DinoRunGame)
        expect(wrapper.find('[data-testid="dino-board"]').exists()).toBe(true)
        expect(wrapper.find('[data-testid="dino-score"]').exists()).toBe(true)
    })
})
