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

// 174: submitScore와 onGameEnd를 각각 독립적으로 눌러볼 수 있는 스텁 — 지뢰찾기 패배처럼
// "점수는 제출하지 않지만 결과 오버레이는 뜨는" 상황을 흉내낸다.
const GameEndStubGame = defineComponent({
    props: {
        submitScore: {type: Function, required: false, default: undefined},
        onGameEnd: {type: Function, required: false, default: undefined},
    },
    // "점수 제출하며 끝내기"는 실제 보드(2048·스네이크 등)의 승리 경로처럼 submitScore와
    // onGameEnd를 함께 호출한다. "점수 없이 끝내기"는 지뢰찾기 패배처럼 onGameEnd만
    // 호출되는 경로를 흉내낸다.
    template: `
      <div>
        <button data-testid="finish" @click="submitScore?.(42); onGameEnd?.()">점수 제출하며 끝내기</button>
        <button data-testid="end-without-score" @click="onGameEnd?.()">점수 없이 끝내기</button>
      </div>
    `,
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
        user.value = {id: 1, provider: 'GOOGLE', nickname: '테스터', email: null, createdAt: '2026-01-01T00:00:00', status: 'ACTIVE'}
        mockSubmitScore.mockResolvedValue({id: 1, gameId: 'game-2048', score: 42, durationMs: 1000, createdAt: '', rank: 3})

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

    it('점수 제출 응답의 순위를 게임 결과 카드 안에 바로 보여주고, 재시작하면 사라진다', async () => {
        accessToken.value = 'a-token'
        user.value = {id: 1, provider: 'GOOGLE', nickname: '테스터', email: null, createdAt: '2026-01-01T00:00:00', status: 'ACTIVE'}
        mockSubmitScore.mockResolvedValue({id: 1, gameId: 'game-2048', score: 42, durationMs: 1000, createdAt: '', rank: 5})

        const wrapper = mount(GamePage, {
            props: {title: '2048', gameId: 'game-2048'},
            slots: {default: (scope: any) => h(GameEndStubGame, scope)},
        })
        await flushPromises()

        await wrapper.find('[data-testid="finish"]').trigger('click')
        await flushPromises()
        // 별도로 열어야 하는 순위표 패널이 아니라, 게임 결과가 뜨는 카드 안에 바로 보여야 한다
        // (순위표 패널 안에 두면 못 보고 지나친다는 피드백으로 위치를 옮김).
        const banner = wrapper.find('[data-testid="game-last-round-rank"]')
        expect(banner.exists()).toBe(true)
        expect(banner.text()).toContain('5')

        await wrapper.find('[data-testid="game-restart"]').trigger('click')
        await flushPromises()

        expect(wrapper.find('[data-testid="game-last-round-rank"]').exists()).toBe(false)
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

    describe('174: 게임 종료 시 순위표 자동 표시', () => {
        it('점수를 제출하며 게임이 끝나면 순위표가 자동으로 열린다', async () => {
            const wrapper = mount(GamePage, {
                props: {title: '2048', gameId: 'game-2048'},
                slots: {default: (scope: any) => h(GameEndStubGame, scope)},
            })
            await flushPromises()
            expect(wrapper.find('[data-testid="game-leaderboard-panel"]').exists()).toBe(false)

            await wrapper.find('[data-testid="finish"]').trigger('click')
            await flushPromises()

            expect(wrapper.find('[data-testid="game-leaderboard-panel"]').exists()).toBe(true)
        })

        // 174 핵심 시나리오: 지뢰찾기 패배처럼 submitScore는 호출되지 않아도(순위표에 제출할
        // 점수가 없는 결과라도) 결과 오버레이가 뜨는 시점(onGameEnd)에는 순위표가 자동으로
        // 열려야 한다 — submitScore 유무와 무관해야 함을 판별하는 테스트.
        it('점수 제출 없이 게임이 끝나도(패배 등) 순위표가 자동으로 열린다', async () => {
            const wrapper = mount(GamePage, {
                props: {title: '지뢰찾기', gameId: 'game-minesweeper'},
                slots: {default: (scope: any) => h(GameEndStubGame, scope)},
            })
            await flushPromises()
            expect(wrapper.find('[data-testid="game-leaderboard-panel"]').exists()).toBe(false)

            await wrapper.find('[data-testid="end-without-score"]').trigger('click')
            await flushPromises()

            expect(mockSubmitScore).not.toHaveBeenCalled()
            expect(wrapper.find('[data-testid="game-leaderboard-panel"]').exists()).toBe(true)
        })

        it('자동으로 열린 순위표를 사용자가 닫으면, 재시작 후 다시 끝나도 자동으로 다시 열리지 않는다(수동 토글은 계속 동작)', async () => {
            const wrapper = mount(GamePage, {
                props: {title: '지뢰찾기', gameId: 'game-minesweeper'},
                slots: {default: (scope: any) => h(GameEndStubGame, scope)},
            })
            await flushPromises()

            await wrapper.find('[data-testid="end-without-score"]').trigger('click')
            await flushPromises()
            expect(wrapper.find('[data-testid="game-leaderboard-panel"]').exists()).toBe(true)

            // 사용자가 명시적으로 닫는다.
            await wrapper.find('[data-testid="game-leaderboard-toggle"]').trigger('click')
            expect(wrapper.find('[data-testid="game-leaderboard-panel"]').exists()).toBe(false)

            // 재시작 후 다시 게임이 끝나도 이번엔 자동으로 열리지 않는다.
            await wrapper.find('[data-testid="game-restart"]').trigger('click')
            await flushPromises()
            await wrapper.find('[data-testid="end-without-score"]').trigger('click')
            await flushPromises()
            expect(wrapper.find('[data-testid="game-leaderboard-panel"]').exists()).toBe(false)

            // 하지만 수동 토글 버튼은 여전히 살아있어 사용자가 원하면 언제든 다시 열 수 있다.
            await wrapper.find('[data-testid="game-leaderboard-toggle"]').trigger('click')
            expect(wrapper.find('[data-testid="game-leaderboard-panel"]').exists()).toBe(true)
        })

        // 억제 판정 기준이 "자동으로 열렸던 적이 있는지"가 아니라 "닫힌 적이 있는지"로 잘못 구현되면,
        // 게임 도중 사용자가 순위표를 스스로 열어봤다가 닫기만 해도 정작 게임이 끝났을 때 자동으로
        // 뜨지 않는 회귀가 생긴다 — 그 회귀를 잡아내는 판별 테스트.
        it('게임 도중 순위표를 스스로 열었다가 닫아도, 게임이 끝나면 여전히 자동으로 열린다', async () => {
            const wrapper = mount(GamePage, {
                props: {title: '2048', gameId: 'game-2048'},
                slots: {default: (scope: any) => h(GameEndStubGame, scope)},
            })
            await flushPromises()

            // 게임이 끝나기 전에 사용자가 스스로 순위표를 열어봤다가 닫는다.
            await wrapper.find('[data-testid="game-leaderboard-toggle"]').trigger('click')
            expect(wrapper.find('[data-testid="game-leaderboard-panel"]').exists()).toBe(true)
            await wrapper.find('[data-testid="game-leaderboard-toggle"]').trigger('click')
            expect(wrapper.find('[data-testid="game-leaderboard-panel"]').exists()).toBe(false)

            // 게임이 끝나면 (자동으로 열린 적이 아직 없었으므로) 여전히 자동으로 열려야 한다.
            await wrapper.find('[data-testid="end-without-score"]').trigger('click')
            await flushPromises()
            expect(wrapper.find('[data-testid="game-leaderboard-panel"]').exists()).toBe(true)
        })
    })
})
