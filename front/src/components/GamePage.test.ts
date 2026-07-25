import {beforeEach, describe, expect, it, vi} from 'vitest'
import {mount, flushPromises} from '@vue/test-utils'
import {defineComponent, h, ref} from 'vue'
import GamePage from './GamePage.vue'
import {accessToken, user} from '@/composables/useAuth'
import {startGameSession, submitGameScore} from '@/api/games'

vi.mock('@/api/games', () => ({
    startGameSession: vi.fn().mockResolvedValue('session-token'),
    submitGameScore: vi.fn(),
    fetchGameLeaderboard: vi.fn().mockResolvedValue({topScores: [], myBest: null, myRank: null}),
}))

const mockStartSession = startGameSession as ReturnType<typeof vi.fn>
const mockSubmitScore = submitGameScore as ReturnType<typeof vi.fn>

// 게임 내부 상태를 흉내내는 스텁: 버튼을 누르면 count가 증가한다.
// GamePage가 재시작 시 slot 콘텐츠를 완전히 새로 마운트하는지(=상태 초기화) 확인하는 데 쓴다.
const StubGame = defineComponent({
    setup() {
        const count = ref(0)
        return {count}
    },
    template: `<button data-testid="bump" @click="count++">{{ count }}</button>`,
})

// submitScore를 즉시 호출하는 스텁 — 053: GamePage가 넘겨준 슬롯 스코프 함수를 그대로 호출해본다.
const ScoringStubGame = defineComponent({
    props: {submitScore: {type: Function, required: false, default: undefined}},
    template: `<button data-testid="finish" @click="submitScore?.(42)">끝내기</button>`,
})

describe('GamePage', () => {
    beforeEach(() => {
        mockStartSession.mockClear()
        mockSubmitScore.mockClear()
        mockStartSession.mockResolvedValue('session-token')
        accessToken.value = null
        user.value = null
    })

    it('title과 description을 렌더링한다', () => {
        const wrapper = mount(GamePage, {props: {title: '2048', description: '타일을 합쳐보세요'}})
        expect(wrapper.text()).toContain('2048')
        expect(wrapper.text()).toContain('타일을 합쳐보세요')
    })

    it('다시 시작 버튼을 누르면 slot 콘텐츠가 완전히 새로 마운트되어 내부 상태가 초기화된다', async () => {
        const wrapper = mount(GamePage, {
            props: {title: '테스트 게임'},
            slots: {default: StubGame},
        })

        await wrapper.find('[data-testid="bump"]').trigger('click')
        await wrapper.find('[data-testid="bump"]').trigger('click')
        expect(wrapper.find('[data-testid="bump"]').text()).toBe('2')

        await wrapper.find('[data-testid="game-restart"]').trigger('click')

        expect(wrapper.find('[data-testid="bump"]').text()).toBe('0')
    })

    it('음소거 토글을 누르면 상태가 뒤집히고 localStorage에 저장되어 새 마운트에도 유지된다', async () => {
        localStorage.removeItem('devtoolbox-game-sound-muted')
        const wrapper = mount(GamePage, {props: {title: '테스트 게임'}})
        const toggle = wrapper.find('[data-testid="game-mute-toggle"]')
        const initialPressed = toggle.attributes('aria-pressed')

        await toggle.trigger('click')

        expect(toggle.attributes('aria-pressed')).not.toBe(initialPressed)
        expect(localStorage.getItem('devtoolbox-game-sound-muted')).toBe(
            toggle.attributes('aria-pressed') === 'true' ? '1' : '0',
        )

        // 새로 마운트해도(다른 게임 페이지로 이동한 상황을 흉내) 같은 음소거 상태가 유지된다 —
        // useGameSound가 useTheme.ts와 같은 모듈 스코프 싱글턴이기 때문.
        const secondWrapper = mount(GamePage, {props: {title: '다른 게임'}})
        expect(secondWrapper.find('[data-testid="game-mute-toggle"]').attributes('aria-pressed'))
            .toBe(toggle.attributes('aria-pressed'))

        // 원래 상태로 복구해 다른 테스트 파일에 영향을 주지 않는다.
        await toggle.trigger('click')
        localStorage.removeItem('devtoolbox-game-sound-muted')
    })

    it('gameId가 없으면 세션을 요청하지 않는다 (뽀모도로 등 점수 없는 모듈)', async () => {
        mount(GamePage, {props: {title: '뽀모도로'}})
        await flushPromises()
        expect(mockStartSession).not.toHaveBeenCalled()
    })

    it('gameId가 있으면 마운트 시 세션 토큰을 요청한다', async () => {
        mount(GamePage, {props: {title: '2048', gameId: 'game-2048'}})
        await flushPromises()
        expect(mockStartSession).toHaveBeenCalledWith('game-2048')
    })

    it('다시 시작하면 세션 토큰을 새로 요청한다', async () => {
        const wrapper = mount(GamePage, {props: {title: '2048', gameId: 'game-2048'}})
        await flushPromises()
        expect(mockStartSession).toHaveBeenCalledTimes(1)

        await wrapper.find('[data-testid="game-restart"]').trigger('click')
        await flushPromises()

        expect(mockStartSession).toHaveBeenCalledTimes(2)
    })

    it('로그인 상태에서 게임이 끝나면 발급받은 세션 토큰으로 점수를 제출한다', async () => {
        accessToken.value = 'a-token'
        user.value = {id: 1, provider: 'GOOGLE', nickname: '테스터', email: null, createdAt: '2026-01-01T00:00:00'}
        mockSubmitScore.mockResolvedValue({id: 1, gameId: 'game-2048', score: 42, durationMs: 1000, createdAt: ''})

        const wrapper = mount(GamePage, {
            props: {title: '2048', gameId: 'game-2048'},
            slots: {default: (scope: any) => h(ScoringStubGame, scope)},
        })
        await flushPromises() // 세션 토큰 발급 대기

        await wrapper.find('[data-testid="finish"]').trigger('click')
        await flushPromises()

        expect(mockSubmitScore).toHaveBeenCalledWith('game-2048', 42, 'session-token')
        expect(wrapper.find('[data-testid="game-login-hint"]').exists()).toBe(false)
    })

    it('비로그인 상태에서 게임이 끝나면 점수를 제출하지 않고 로그인 유도 문구를 보여준다', async () => {
        const wrapper = mount(GamePage, {
            props: {title: '2048', gameId: 'game-2048'},
            slots: {default: (scope: any) => h(ScoringStubGame, scope)},
        })
        await flushPromises()

        await wrapper.find('[data-testid="finish"]').trigger('click')
        await flushPromises()

        expect(mockSubmitScore).not.toHaveBeenCalled()
        expect(wrapper.find('[data-testid="game-login-hint"]').exists()).toBe(true)
    })

    it('gameId가 있으면 순위표 토글 버튼이 보이고, 없으면 보이지 않는다', () => {
        const withGame = mount(GamePage, {props: {title: '2048', gameId: 'game-2048'}})
        expect(withGame.find('[data-testid="game-leaderboard-toggle"]').exists()).toBe(true)

        const withoutGame = mount(GamePage, {props: {title: '뽀모도로'}})
        expect(withoutGame.find('[data-testid="game-leaderboard-toggle"]').exists()).toBe(false)
    })

    // 166: 헤더 바 버튼 그룹 가운데 정렬 — jsdom은 실제 레이아웃을 계산하지 않으므로 여기서는
    // 좌측 제목/가운데 버튼 그룹/우측 스페이서라는 3분할 구조 자체가 존재하는지만 구조적으로
    // 확인한다. 실제 가운데 정렬 여부(라이트/다크·데스크톱/모바일)는 실브라우저로 검증한다.
    it('166: 헤더 바가 좌측 제목 / 가운데 버튼 그룹 / 우측 스페이서의 3분할 구조를 갖는다', () => {
        const wrapper = mount(GamePage, {props: {title: '2048', gameId: 'game-2048'}})
        const header = wrapper.find('[data-testid="game-mute-toggle"]').element.closest('.grid')
        expect(header).not.toBeNull()

        const columns = header!.children
        expect(columns.length).toBe(3) // 제목 블록 / 버튼 그룹 / 빈 스페이서
        // 버튼 그룹(가운데 컬럼)이 재시작·음소거 버튼을 모두 담고 있어야 한다.
        expect(columns[1].querySelector('[data-testid="game-mute-toggle"]')).not.toBeNull()
        expect(columns[1].querySelector('[data-testid="game-restart"]')).not.toBeNull()
        // 우측 스페이서(3번째 컬럼)는 내용이 비어있다 — 순전히 균형용.
        expect(columns[2].textContent?.trim()).toBe('')
    })

    // 166: restart도 submitScore처럼 slot scope로 노출돼, GameResultOverlay 안의 재시작 버튼이
    // GamePage의 실제 restart()를 호출할 수 있게 한다. 실제 게임(TowerStackGame 등)에서는 이
    // slot scope의 restart가 GameResultOverlay까지 그대로 이어지는 걸 종단 간으로 검증하지만,
    // 여기서는 GamePage가 slot에 restart 함수 자체를 실어 보내는지를 직접 확인한다.
    it('166: slot scope로 넘겨준 restart를 호출하면 헤더 버튼을 누른 것과 동일하게 내부 상태가 초기화된다', async () => {
        const RestartAwareStub = defineComponent({
            props: {
                restart: {type: Function, required: false, default: undefined},
                submitScore: {type: Function, required: false, default: undefined},
            },
            setup() {
                const count = ref(0)
                return {count}
            },
            template: `<button data-testid="bump" @click="count++">{{ count }}</button>
                        <button data-testid="call-restart" @click="restart?.()"/>`,
        })
        const wrapper = mount(GamePage, {
            props: {title: '테스트 게임'},
            slots: {default: (scope: any) => h(RestartAwareStub, scope)},
        })

        await wrapper.find('[data-testid="bump"]').trigger('click')
        expect(wrapper.find('[data-testid="bump"]').text()).toBe('1')

        await wrapper.find('[data-testid="call-restart"]').trigger('click')

        // slot으로 받은 restart()가 GamePage의 진짜 restart와 같은 함수라면, 헤더 버튼과
        // 동일하게 restartKey가 바뀌어 슬롯 전체가 재마운트되고 count가 0으로 되돌아간다.
        expect(wrapper.find('[data-testid="bump"]').text()).toBe('0')
    })
})
