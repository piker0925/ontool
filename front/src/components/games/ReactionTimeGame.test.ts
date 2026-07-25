import {beforeEach, describe, expect, it, vi} from 'vitest'
import {mount, flushPromises} from '@vue/test-utils'
import ReactionTimeGame from './ReactionTimeGame.vue'
import {accessToken, user} from '@/composables/useAuth'
import {submitGameScore} from '@/api/games'

vi.mock('@/api/games', () => ({
    startGameSession: vi.fn().mockResolvedValue('session-token'),
    submitGameScore: vi.fn().mockResolvedValue({}),
    fetchGameLeaderboard: vi.fn().mockResolvedValue({topScores: [], myBest: null, myRank: null}),
}))

const mockSubmitScore = submitGameScore as ReturnType<typeof vi.fn>

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

describe('ReactionTimeGame — 053 점수 제출', () => {
    beforeEach(() => {
        mockSubmitScore.mockClear()
        accessToken.value = 'token'
        user.value = {id: 1, provider: 'GOOGLE', nickname: '테스터', email: null, createdAt: '2026-01-01T00:00:00'}
    })

    it('결과가 나오면 측정된 ms를 점수로 제출한다', async () => {
        vi.useFakeTimers()
        try {
            const wrapper = mount(ReactionTimeGame)
            await flushPromises() // 세션 토큰 발급 대기

            await wrapper.find('[data-testid="reaction-start"]').trigger('click')
            await vi.advanceTimersByTimeAsync(5_000)
            await wrapper.find('[data-testid="reaction-area"]').trigger('click')
            await flushPromises()

            const shownMs = Number(wrapper.find('[data-testid="reaction-result"]').text().replace('ms', ''))
            expect(mockSubmitScore).toHaveBeenCalledWith('game-reaction-time', shownMs, 'session-token')
        } finally {
            vi.useRealTimers()
        }
    })

    it('"다시 도전"은 GamePage를 재마운트하지 않으므로(세션 토큰 그대로) 매 시도마다 다시 제출된다', async () => {
        vi.useFakeTimers()
        try {
            const wrapper = mount(ReactionTimeGame)
            await flushPromises()

            await wrapper.find('[data-testid="reaction-start"]').trigger('click')
            await vi.advanceTimersByTimeAsync(5_000)
            await wrapper.find('[data-testid="reaction-area"]').trigger('click')
            await flushPromises()
            expect(mockSubmitScore).toHaveBeenCalledTimes(1)

            // "다시 도전" 버튼(보드 내부 start()) — GamePage의 재시작 버튼이 아님
            await wrapper.find('button.text-primary.underline').trigger('click')
            await vi.advanceTimersByTimeAsync(5_000)
            await wrapper.find('[data-testid="reaction-area"]').trigger('click')
            await flushPromises()

            expect(mockSubmitScore).toHaveBeenCalledTimes(2)
        } finally {
            vi.useRealTimers()
        }
    })

    it('너무 빨리 클릭한 false-start는 점수를 제출하지 않는다', async () => {
        vi.useFakeTimers()
        try {
            const wrapper = mount(ReactionTimeGame)
            await flushPromises()

            await wrapper.find('[data-testid="reaction-start"]').trigger('click')
            // ready로 전환되기 전(최소 1초) 클릭 — false-start
            await wrapper.find('[data-testid="reaction-area"]').trigger('click')
            await flushPromises()

            expect(wrapper.find('[data-testid="reaction-false-start"]').exists()).toBe(true)
            expect(mockSubmitScore).not.toHaveBeenCalled()
        } finally {
            vi.useRealTimers()
        }
    })
})
