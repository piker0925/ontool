import {describe, expect, it, vi} from 'vitest'
import {mount} from '@vue/test-utils'
import ReactionTimeGame from './ReactionTimeGame.vue'

describe('ReactionTimeGame — 재시작', () => {
    it('결과가 나온 뒤 다시 시작하면 idle 상태(시작 버튼)로 완전히 되돌아간다', async () => {
        vi.useFakeTimers()
        try {
            const wrapper = mount(ReactionTimeGame)

            await wrapper.find('[data-testid="reaction-start"]').trigger('click')
            await vi.advanceTimersByTimeAsync(5_000) // 대기 시간(최대 4초) 경과 → ready 상태
            await wrapper.find('[data-testid="reaction-area"]').trigger('click')

            expect(wrapper.find('[data-testid="reaction-result"]').exists()).toBe(true)

            await wrapper.find('[data-testid="game-restart"]').trigger('click')

            expect(wrapper.find('[data-testid="reaction-start"]').exists()).toBe(true)
            expect(wrapper.find('[data-testid="reaction-result"]').exists()).toBe(false)
        } finally {
            vi.useRealTimers()
        }
    })
})
