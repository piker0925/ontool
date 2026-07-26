import {describe, expect, it, vi} from 'vitest'
import {mount} from '@vue/test-utils'
import SimonGame from './SimonGame.vue'

describe('SimonGame — 재시작', () => {
    it('플레이 중 다시 시작하면 idle 상태(시작 버튼)의 라운드 1로 되돌아간다', async () => {
        vi.useFakeTimers()
        try {
            const wrapper = mount(SimonGame)
            await wrapper.find('[data-testid="simon-start"]').trigger('click')
            // 172: 1라운드는 속도 스케줄상 기본 속도보다 느리게(showMs+gapMs≈1450ms) 재생되므로
            // 넉넉히 대기한다 — 시퀀스 재생 끝 → input 단계
            await vi.advanceTimersByTimeAsync(1600)
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
