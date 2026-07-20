import {describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import NumberBaseballGame from './NumberBaseballGame.vue'

describe('NumberBaseballGame — 재시작', () => {
    it('추측을 한 번 제출한 뒤 다시 시작하면 기록이 비워진 새 게임으로 돌아간다', async () => {
        const wrapper = mount(NumberBaseballGame)

        await wrapper.find('[data-testid="guess-input"]').setValue('012')
        await wrapper.find('form').trigger('submit')

        expect(wrapper.findAll('[data-testid="history"] > li').length).toBe(1)

        await wrapper.find('[data-testid="game-restart"]').trigger('click')

        expect(wrapper.findAll('[data-testid="history"] > li').length).toBe(0)
    })
})
