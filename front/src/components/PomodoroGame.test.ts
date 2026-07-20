import {describe, expect, it, vi} from 'vitest'
import {mount} from '@vue/test-utils'
import PomodoroGame from './PomodoroGame.vue'

describe('PomodoroGame', () => {
    it('작업 시간이 끝나면 자동으로 휴식 단계로 전환된다', async () => {
        vi.useFakeTimers()
        try {
            const wrapper = mount(PomodoroGame)
            await wrapper.find('[data-testid="toggle-running"]').trigger('click')

            expect(wrapper.find('[data-testid="phase"]').text()).toBe('작업 시간')
            await vi.advanceTimersByTimeAsync(25 * 60 * 1000) // 기본 작업 시간(25분) 전부 경과

            expect(wrapper.find('[data-testid="phase"]').text()).toBe('휴식 시간')
        } finally {
            vi.useRealTimers()
        }
    })

    it('일시정지했다가 재개해도 남은 시간이 리셋되지 않고 그대로 이어진다', async () => {
        vi.useFakeTimers()
        try {
            const wrapper = mount(PomodoroGame)
            await wrapper.find('[data-testid="toggle-running"]').trigger('click') // 시작
            await vi.advanceTimersByTimeAsync(5000) // 5초 경과 → 24:55

            const timeBeforePause = wrapper.find('[data-testid="time"]').text()
            expect(timeBeforePause).toBe('24:55')

            await wrapper.find('[data-testid="toggle-running"]').trigger('click') // 일시정지
            await vi.advanceTimersByTimeAsync(5000) // 정지 중이므로 시간이 지나도 변화 없어야 함
            expect(wrapper.find('[data-testid="time"]').text()).toBe(timeBeforePause)

            await wrapper.find('[data-testid="toggle-running"]').trigger('click') // 재개
            expect(wrapper.find('[data-testid="time"]').text()).toBe(timeBeforePause) // 재개 즉시 리셋되지 않음

            await vi.advanceTimersByTimeAsync(1000)
            expect(wrapper.find('[data-testid="time"]').text()).toBe('24:54') // 멈췄던 지점에서 정확히 이어짐
        } finally {
            vi.useRealTimers()
        }
    })

    it('다시 시작하면 작업 25분 상태로 완전히 초기화된다', async () => {
        vi.useFakeTimers()
        try {
            const wrapper = mount(PomodoroGame)
            await wrapper.find('[data-testid="toggle-running"]').trigger('click')
            await vi.advanceTimersByTimeAsync(10000)

            await wrapper.find('[data-testid="game-restart"]').trigger('click')

            expect(wrapper.find('[data-testid="time"]').text()).toBe('25:00')
            expect(wrapper.find('[data-testid="phase"]').text()).toBe('작업 시간')
            expect(wrapper.find('[data-testid="toggle-running"]').text()).toBe('시작')
        } finally {
            vi.useRealTimers()
        }
    })
})
