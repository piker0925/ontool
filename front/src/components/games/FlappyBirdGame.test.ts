import {describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import FlappyBirdGame from './FlappyBirdGame.vue'

describe('FlappyBirdGame', () => {
    it('초기 마운트 시 2D 플래피버드 보드가 표시된다', () => {
        const wrapper = mount(FlappyBirdGame)
        expect(wrapper.find('[data-testid="flappy-board"]').exists()).toBe(true)
        expect(wrapper.find('[data-testid="flappy-score"]').exists()).toBe(true)
    })
})
