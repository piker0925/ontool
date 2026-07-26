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

        // 174: 최대 100등을 한 번에 받아 화면에서 페이징한다 — 항상 limit=100으로 요청한다.
        expect(mockFetch).toHaveBeenCalledWith('game-2048', 100)
        const rows = wrapper.findAll('[data-testid="leaderboard-entries"] li')
        expect(rows).toHaveLength(2)
        expect(rows[0].text()).toContain('1등')
        expect(rows[0].text()).toContain('100')
        expect(rows[0].text()).toContain('100점') // 174: 2048은 점수형 → "점" 단위가 붙는다
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

    describe('174: 페이징(10개씩, 최대 100등)', () => {
        function entriesOf(count: number) {
            return Array.from({length: count}, (_, i) => ({
                userId: i + 1,
                nickname: `${i + 1}등`,
                score: 1000 - i,
                durationMs: 1000,
                createdAt: '2026-07-25T00:00:00',
            }))
        }

        it('10개 이하도 "전체 순위 보기"를 펼치면 페이지네이션 컨트롤 없이 전부 보여준다', async () => {
            mockFetch.mockResolvedValue({topScores: entriesOf(10), myBest: null, myRank: null})

            const wrapper = mount(GameLeaderboardPanel, {props: {gameId: 'game-2048'}})
            await flushPromises()
            await wrapper.find('[data-testid="leaderboard-expand-toggle"]').trigger('click')

            expect(wrapper.find('[data-testid="leaderboard-pagination"]').exists()).toBe(false)
            expect(wrapper.findAll('[data-testid="leaderboard-entries"] li')).toHaveLength(10)
        })

        it('11개 이상이면 펼쳤을 때 10개씩 나눠 보여주고, 다음/이전으로 순위 번호가 이어진다', async () => {
            mockFetch.mockResolvedValue({topScores: entriesOf(25), myBest: null, myRank: null})

            const wrapper = mount(GameLeaderboardPanel, {props: {gameId: 'game-2048'}})
            await flushPromises()
            await wrapper.find('[data-testid="leaderboard-expand-toggle"]').trigger('click')

            // 1페이지: 1~10등, 이전 비활성화
            let rows = wrapper.findAll('[data-testid="leaderboard-entries"] li')
            expect(rows).toHaveLength(10)
            expect(rows[0].text()).toContain('1등')
            expect(wrapper.find('[data-testid="leaderboard-prev-page"]').attributes('disabled')).toBeDefined()

            await wrapper.find('[data-testid="leaderboard-next-page"]').trigger('click')

            // 2페이지: 11~20등 — 로컬 페이징이므로 추가 네트워크 요청 없이 즉시 전환된다
            expect(mockFetch).toHaveBeenCalledTimes(1)
            rows = wrapper.findAll('[data-testid="leaderboard-entries"] li')
            expect(rows).toHaveLength(10)
            expect(rows[0].text()).toContain('11')
            expect(rows[0].text()).toContain('11등')

            await wrapper.find('[data-testid="leaderboard-next-page"]').trigger('click')

            // 3페이지(마지막): 21~25등, 5개뿐이고 다음이 비활성화된다
            rows = wrapper.findAll('[data-testid="leaderboard-entries"] li')
            expect(rows).toHaveLength(5)
            expect(rows[0].text()).toContain('21')
            expect(rows[4].text()).toContain('25')
            expect(wrapper.find('[data-testid="leaderboard-next-page"]').attributes('disabled')).toBeDefined()

            await wrapper.find('[data-testid="leaderboard-prev-page"]').trigger('click')
            rows = wrapper.findAll('[data-testid="leaderboard-entries"] li')
            expect(rows[0].text()).toContain('11등') // 이전으로 되돌아가면 다시 11~20등
        })

        it('100등을 넘는 기록은 애초에 요청하지 않는다(limit=100)', async () => {
            mockFetch.mockResolvedValue({topScores: entriesOf(100), myBest: null, myRank: null})
            mount(GameLeaderboardPanel, {props: {gameId: 'game-2048'}})
            await flushPromises()

            expect(mockFetch).toHaveBeenCalledWith('game-2048', 100)
        })

        it('기본(접힌) 상태는 몇 등까지 있든 상위 3명 포디움만 보여준다', async () => {
            mockFetch.mockResolvedValue({topScores: entriesOf(25), myBest: null, myRank: null})

            const wrapper = mount(GameLeaderboardPanel, {props: {gameId: 'game-2048'}})
            await flushPromises()

            expect(wrapper.findAll('[data-testid="leaderboard-entries"] li')).toHaveLength(3)
            expect(wrapper.find('[data-testid="leaderboard-pagination"]').exists()).toBe(false)
        })

        it('"전체 순위 보기"는 3명 넘게 있을 때만 나타나고, 누르면 펼쳐졌다가 "접기"로 다시 접힌다', async () => {
            mockFetch.mockResolvedValue({topScores: entriesOf(5), myBest: null, myRank: null})

            const wrapper = mount(GameLeaderboardPanel, {props: {gameId: 'game-2048'}})
            await flushPromises()

            const toggle = wrapper.find('[data-testid="leaderboard-expand-toggle"]')
            expect(toggle.exists()).toBe(true)
            expect(toggle.text()).toBe('전체 순위 보기')
            expect(wrapper.findAll('[data-testid="leaderboard-entries"] li')).toHaveLength(3)

            await toggle.trigger('click')
            expect(wrapper.find('[data-testid="leaderboard-expand-toggle"]').text()).toBe('접기')
            expect(wrapper.findAll('[data-testid="leaderboard-entries"] li')).toHaveLength(5)

            await wrapper.find('[data-testid="leaderboard-expand-toggle"]').trigger('click')
            expect(wrapper.find('[data-testid="leaderboard-expand-toggle"]').text()).toBe('전체 순위 보기')
            expect(wrapper.findAll('[data-testid="leaderboard-entries"] li')).toHaveLength(3)
        })

        it('3명 이하면 "전체 순위 보기" 버튼 자체가 없다', async () => {
            mockFetch.mockResolvedValue({topScores: entriesOf(3), myBest: null, myRank: null})

            const wrapper = mount(GameLeaderboardPanel, {props: {gameId: 'game-2048'}})
            await flushPromises()

            expect(wrapper.find('[data-testid="leaderboard-expand-toggle"]').exists()).toBe(false)
        })
    })

    describe('1~3등 트로피 표시', () => {
        function entriesOf(count: number) {
            return Array.from({length: count}, (_, i) => ({
                userId: i + 1,
                nickname: `${i + 1}등`,
                score: 1000 - i,
                durationMs: 1000,
                createdAt: '2026-07-25T00:00:00',
            }))
        }

        it('1~3등은 순위 숫자 대신 트로피 아이콘이, 4등부터는 숫자가 표시된다', async () => {
            mockFetch.mockResolvedValue({topScores: entriesOf(5), myBest: null, myRank: null})

            const wrapper = mount(GameLeaderboardPanel, {props: {gameId: 'game-2048'}})
            await flushPromises()
            await wrapper.find('[data-testid="leaderboard-expand-toggle"]').trigger('click')

            const rows = wrapper.findAll('[data-testid="leaderboard-entries"] li')
            // 1~3등: 트로피 아이콘만 있고 숫자 배지는 없다
            for (const i of [0, 1, 2]) {
                expect(rows[i].find('[data-testid="leaderboard-trophy"]').exists()).toBe(true)
                expect(rows[i].find('[data-testid="leaderboard-rank-number"]').exists()).toBe(false)
            }
            // 4~5등: 트로피 없이 숫자 배지만 있다
            for (const i of [3, 4]) {
                expect(rows[i].find('[data-testid="leaderboard-trophy"]').exists()).toBe(false)
                expect(rows[i].find('[data-testid="leaderboard-rank-number"]').text()).toBe(String(i + 1))
            }
        })

        it('1등·2등·3등 트로피는 서로 다른 색(금·은·동) 클래스를 쓴다', async () => {
            mockFetch.mockResolvedValue({topScores: entriesOf(3), myBest: null, myRank: null})

            const wrapper = mount(GameLeaderboardPanel, {props: {gameId: 'game-2048'}})
            await flushPromises()

            const trophies = wrapper.findAll('[data-testid="leaderboard-entries"] li').map(
                row => row.find('[data-testid="leaderboard-trophy"]'),
            )
            const classLists = trophies.map(t => t.classes().join(' '))
            // 셋 다 서로 다른 색상 클래스를 가져야 한다(금은동 구분이 실제로 있는지 확인)
            expect(new Set(classLists).size).toBe(3)
        })
    })

    describe('이번 판 순위(lastRoundRank)', () => {
        it('lastRoundRank가 있으면 역대 최고 기록과 별도로 이번 판 순위를 보여준다', async () => {
            mockFetch.mockResolvedValue({
                topScores: [{userId: 1, nickname: '나', score: 50, durationMs: 1000, createdAt: '2026-07-25T00:00:00'}],
                myBest: 100,
                myRank: 1,
            })

            const wrapper = mount(GameLeaderboardPanel, {props: {gameId: 'game-2048', lastRoundRank: 4}})
            await flushPromises()

            const lastRound = wrapper.find('[data-testid="leaderboard-last-round-rank"]')
            expect(lastRound.exists()).toBe(true)
            expect(lastRound.text()).toContain('4')

            // 역대 최고 기록(myRank=1)과 이번 판 순위(4)가 서로 다른 값으로 동시에 보여야
            // "최고 기록만 나와서 헷갈린다"는 문제가 실제로 해결됐음을 확인할 수 있다.
            const myRankEl = wrapper.find('[data-testid="leaderboard-my-rank"]')
            expect(myRankEl.text()).toContain('1')
            expect(myRankEl.text()).toContain('100')
        })

        it('lastRoundRank가 없으면(null/미지정) 이번 판 순위 줄이 안 보인다', async () => {
            mockFetch.mockResolvedValue({
                topScores: [{userId: 1, nickname: '나', score: 50, durationMs: 1000, createdAt: '2026-07-25T00:00:00'}],
                myBest: null,
                myRank: null,
            })

            const wrapper = mount(GameLeaderboardPanel, {props: {gameId: 'game-2048'}})
            await flushPromises()

            expect(wrapper.find('[data-testid="leaderboard-last-round-rank"]').exists()).toBe(false)
        })
    })

    describe('174: 게임별 점수 단위', () => {
        it('반응속도는 ms 단위로 표시된다', async () => {
            mockFetch.mockResolvedValue({
                topScores: [{userId: 1, nickname: '1등', score: 234, durationMs: 1000, createdAt: '2026-07-25T00:00:00'}],
                myBest: null,
                myRank: null,
            })

            const wrapper = mount(GameLeaderboardPanel, {props: {gameId: 'game-reaction-time'}})
            await flushPromises()

            expect(wrapper.find('[data-testid="leaderboard-entries"] li').text()).toContain('234ms')
        })

        it('지뢰찾기는 ms로 저장된 점수를 초 단위로 환산해 표시한다', async () => {
            mockFetch.mockResolvedValue({
                topScores: [{userId: 1, nickname: '1등', score: 45500, durationMs: 45500, createdAt: '2026-07-25T00:00:00'}],
                myBest: null,
                myRank: null,
            })

            const wrapper = mount(GameLeaderboardPanel, {props: {gameId: 'game-minesweeper'}})
            await flushPromises()

            const text = wrapper.find('[data-testid="leaderboard-entries"] li').text()
            expect(text).toContain('46초') // 45500ms → 반올림 46초 (ms 그대로 "46초"가 아님을 확인)
            expect(text).not.toContain('45500')
        })

        it('숫자야구는 시도 횟수(번) 단위로 표시된다', async () => {
            mockFetch.mockResolvedValue({
                topScores: [{userId: 1, nickname: '1등', score: 3, durationMs: 1000, createdAt: '2026-07-25T00:00:00'}],
                myBest: null,
                myRank: null,
            })

            const wrapper = mount(GameLeaderboardPanel, {props: {gameId: 'game-baseball'}})
            await flushPromises()

            expect(wrapper.find('[data-testid="leaderboard-entries"] li').text()).toContain('3번')
        })

        it('워터소트는 이동 횟수(번) 단위로, 타워쌓기는 점수형(점) 단위로 표시된다', async () => {
            mockFetch.mockResolvedValue({
                topScores: [{userId: 1, nickname: '1등', score: 9, durationMs: 1000, createdAt: '2026-07-25T00:00:00'}],
                myBest: null,
                myRank: null,
            })

            const waterSort = mount(GameLeaderboardPanel, {props: {gameId: 'game-water-sort'}})
            await flushPromises()
            expect(waterSort.find('[data-testid="leaderboard-entries"] li').text()).toContain('9번')

            const towerStack = mount(GameLeaderboardPanel, {props: {gameId: 'game-tower-stack'}})
            await flushPromises()
            expect(towerStack.find('[data-testid="leaderboard-entries"] li').text()).toContain('9점')
        })
    })
})
