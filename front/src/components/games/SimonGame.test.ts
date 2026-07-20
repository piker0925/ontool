import {describe, expect, it, vi} from 'vitest'
import {mount} from '@vue/test-utils'
import SimonGame from './SimonGame.vue'

describe('SimonGame — 재시작', () => {
    it('플레이 중 다시 시작하면 idle 상태(시작 버튼)의 라운드 1로 되돌아간다', async () => {
        vi.useFakeTimers()
        try {
            const wrapper = mount(SimonGame)
            await wrapper.find('[data-testid="simon-start"]').trigger('click')
            await vi.advanceTimersByTimeAsync(1000) // 시퀀스 재생 끝 → input 단계
            await wrapper.find('[data-testid="simon-color-0"]').trigger('click') // 정답이든 오답이든 상태가 idle을 벗어남

            expect(wrapper.find('[data-testid="simon-start"]').exists()).toBe(false)

            await wrapper.find('[data-testid="game-restart"]').trigger('click')

            expect(wrapper.find('[data-testid="simon-start"]').exists()).toBe(true)
            expect(wrapper.find('[data-testid="round"]').text()).toBe('1')
        } finally {
            vi.useRealTimers()
        }
    })
})
