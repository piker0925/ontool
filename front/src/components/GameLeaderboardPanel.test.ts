import {beforeEach, describe, expect, it, vi} from 'vitest'
import {mount, flushPromises} from '@vue/test-utils'
import GameLeaderboardPanel from './GameLeaderboardPanel.vue'
import {accessToken, user} from '@/composables/useAuth'
import {fetchGameLeaderboard} from '@/api/games'

vi.mock('@/api/games', () => ({
    fetchGameLeaderboard: vi.fn(),
}))

const mockFetch = fetchGameLeaderboard as ReturnType<typeof vi.fn>

describe('GameLeaderboardPanel', () => {
    beforeEach(() => {
        mockFetch.mockReset()
        accessToken.value = null
        user.value = null
    })

    it('마운트 시 상위 기록을 순위대로 표시한다', async () => {
        mockFetch.mockResolvedValue({
            topScores: [
                {userId: 1, nickname: '1등', score: 100, durationMs: 5000, createdAt: '2026-07-25T00:00:00'},
                {userId: 2, nickname: '2등', score: 80, durationMs: 5000, createdAt: '2026-07-25T00:00:00'},
            ],
            myBest: null,
            myRank: null,
        })

        const wrapper = mount(GameLeaderboardPanel, {props: {gameId: 'game-2048'}})
        await flushPromises()

        expect(mockFetch).toHaveBeenCalledWith('game-2048')
        const rows = wrapper.findAll('[data-testid="leaderboard-entries"] li')
        expect(rows).toHaveLength(2)
        expect(rows[0].text()).toContain('1등')
        expect(rows[0].text()).toContain('100')
        expect(rows[1].text()).toContain('2등')
    })

    it('기록이 없으면 빈 상태 문구를 보여준다', async () => {
        mockFetch.mockResolvedValue({topScores: [], myBest: null, myRank: null})

        const wrapper = mount(GameLeaderboardPanel, {props: {gameId: 'game-2048'}})
        await flushPromises()

        expect(wrapper.find('[data-testid="leaderboard-entries"]').exists()).toBe(false)
        expect(wrapper.text()).toContain('아직 등록된 기록이 없어요')
    })

    it('로그인 사용자는 내 순위가 함께 표시된다', async () => {
        mockFetch.mockResolvedValue({
            topScores: [{userId: 9, nickname: '1등', score: 999, durationMs: 1000, createdAt: '2026-07-25T00:00:00'}],
            myBest: 42,
            myRank: 7,
        })

        const wrapper = mount(GameLeaderboardPanel, {props: {gameId: 'game-2048'}})
        await flushPromises()

        const myRankEl = wrapper.find('[data-testid="leaderboard-my-rank"]')
        expect(myRankEl.exists()).toBe(true)
        expect(myRankEl.text()).toContain('7')
        expect(myRankEl.text()).toContain('42')
    })

    it('조회 실패 시 에러 문구를 보여준다', async () => {
        mockFetch.mockRejectedValue(new Error('network error'))

        const wrapper = mount(GameLeaderboardPanel, {props: {gameId: 'game-2048'}})
        await flushPromises()

        expect(wrapper.text()).toContain('순위표를 불러오지 못했습니다')
    })
})
