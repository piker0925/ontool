import {describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import SuikaMergeGame from './SuikaMergeGame.vue'

describe('SuikaMergeGame', () => {
    it('초기 마운트 시 2D 과일 용기 보드가 표시된다', () => {
        const wrapper = mount(SuikaMergeGame)
        expect(wrapper.find('[data-testid="suika-board"]').exists()).toBe(true)
        expect(wrapper.find('[data-testid="suika-score"]').exists()).toBe(true)
    })
})
