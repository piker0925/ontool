import {beforeEach, describe, expect, it, vi} from 'vitest'
import {mount, flushPromises} from '@vue/test-utils'
import TicTacToeGame from './TicTacToeGame.vue'
import {accessToken, user} from '@/composables/useAuth'
import {submitGameScore} from '@/api/games'

vi.mock('@/api/games', () => ({
    startGameSession: vi.fn().mockResolvedValue('session-token'),
    submitGameScore: vi.fn().mockResolvedValue({}),
    fetchGameLeaderboard: vi.fn().mockResolvedValue({topScores: [], myBest: null, myRank: null}),
}))

const mockSubmitScore = submitGameScore as ReturnType<typeof vi.fn>

describe('TicTacToeGame — 재시작', () => {
    it('몇 수를 둔 뒤 다시 시작하면 보드가 빈 상태로 되돌아간다', async () => {
        vi.useFakeTimers()
        try {
            const wrapper = mount(TicTacToeGame)
            const cells = wrapper.findAll('[data-testid="board"] > button')

            await cells[0].trigger('click')
            await vi.advanceTimersByTimeAsync(500) // 컴퓨터 수까지 진행

            const filledBefore = wrapper.findAll('[data-testid="board"] > button').filter(c => c.text() !== '').length
            expect(filledBefore).toBe(2) // 사람 1수 + 컴퓨터 1수

            await wrapper.find('[data-testid="game-restart"]').trigger('click')

            const filledAfter = wrapper.findAll('[data-testid="board"] > button').filter(c => c.text() !== '').length
            expect(filledAfter).toBe(0)
        } finally {
            vi.useRealTimers()
        }
    })
})

describe('TicTacToeGame — 053 점수 제출', () => {
    beforeEach(() => {
        mockSubmitScore.mockClear()
        accessToken.value = 'token'
        user.value = {id: 1, provider: 'GOOGLE', nickname: '테스터', email: null, createdAt: '2026-01-01T00:00:00', status: 'ACTIVE'}
    })

    it('사람이 승리하면(computerMove는 1수 앞만 보는 휴리스틱이라 포크로 이길 수 있음) 승리까지 둔 수를 점수로 제출하고 화면에도 보여준다', async () => {
        vi.useFakeTimers()
        try {
            const wrapper = mount(TicTacToeGame)
            await flushPromises() // 세션 토큰 발급 대기

            const cells = wrapper.findAll('[data-testid="board"] > button')
            // 0→(컴퓨터 4)→8→(컴퓨터 2)→6(0-3-6·6-7-8 이중 위협 생성, 컴퓨터는 3만 막음)→7(6-7-8 완성, 승리)
            // 사람이 둔 수는 4번(0,8,6,7) — 053: 승패만 있는 게임이라 "승리까지 둔 수(적을수록 좋음)"를 점수로 쓴다.
            await cells[0].trigger('click')
            await vi.advanceTimersByTimeAsync(500)
            await cells[8].trigger('click')
            await vi.advanceTimersByTimeAsync(500)
            await cells[6].trigger('click')
            await vi.advanceTimersByTimeAsync(500)
            await cells[7].trigger('click')
            await flushPromises()

            expect(wrapper.find('[data-testid="game-result-overlay"]').text()).toContain('승리했습니다')
            expect(wrapper.find('[data-testid="win-moves"]').text()).toContain('4수 만에 승리했습니다')
            expect(wrapper.find('[data-testid="move-count"]').text()).toBe('4') // 결과 메시지와 무관하게 항상 보이는 카운터도 동기화됨
            expect(mockSubmitScore).toHaveBeenCalledWith('game-tictactoe', 4, 'session-token')
        } finally {
            vi.useRealTimers()
        }
    })

    it('패배해도 점수는 제출하지 않지만 둔 수는 화면에 계속 보인다(053: 게임 종료 시 항상 점수 표시)', async () => {
        vi.useFakeTimers()
        try {
            const wrapper = mount(TicTacToeGame)
            await flushPromises()

            const cells = wrapper.findAll('[data-testid="board"] > button')
            // 모서리를 계속 양보해 컴퓨터가 먼저 줄을 완성하도록 유도 (0→4는 컴퓨터, 이후 인간이 계속 구석만 둠)
            await cells[1].trigger('click')
            await vi.advanceTimersByTimeAsync(500) // 컴퓨터 4
            await cells[2].trigger('click')
            await vi.advanceTimersByTimeAsync(500) // 컴퓨터가 0-4-8 완성 위협 등에 대응
            await cells[3].trigger('click')
            await vi.advanceTimersByTimeAsync(500)
            await flushPromises()

            expect(mockSubmitScore).not.toHaveBeenCalled()
            // 승패와 무관하게 "내가 둔 수"는 항상 표시된다 — win-moves(승리 전용 문구)와는 별개.
            expect(wrapper.find('[data-testid="move-count"]').text()).toBe('3')
        } finally {
            vi.useRealTimers()
        }
    })
})
