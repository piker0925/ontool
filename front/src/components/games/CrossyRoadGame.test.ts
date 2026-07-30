import {describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import CrossyRoadGame from './CrossyRoadGame.vue'

describe('CrossyRoadGame', () => {
    it('초기 마운트 시 2D Isometric 길건너 보드가 표시된다', () => {
        const wrapper = mount(CrossyRoadGame)
        expect(wrapper.find('[data-testid="crossy-board"]').exists()).toBe(true)
        expect(wrapper.find('[data-testid="crossy-score"]').exists()).toBe(true)
    })
})
