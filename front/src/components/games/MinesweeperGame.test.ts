import {afterEach, describe, expect, it, vi} from 'vitest'
import {mount} from '@vue/test-utils'
import MinesweeperGame from './MinesweeperGame.vue'

describe('MinesweeperGame — 재시작', () => {
    it('다시 시작 버튼을 누르면 열린 칸이 모두 닫힌 새 보드로 돌아간다', async () => {
        const wrapper = mount(MinesweeperGame)

        // 여러 칸을 열어 상태를 초기값에서 벗어나게 만든다.
        const cells = wrapper.findAll('[data-testid="board"] > button')
        for (const cell of cells.slice(0, 10)) {
            await cell.trigger('click')
        }
        const revealedBefore = wrapper.findAll('[data-testid="board"] > button')
            .filter(c => c.text() !== '').length
        expect(revealedBefore).toBeGreaterThan(0)

        await wrapper.find('[data-testid="game-restart"]').trigger('click')

        const revealedAfter = wrapper.findAll('[data-testid="board"] > button')
            .filter(c => c.text() !== '').length
        expect(revealedAfter).toBe(0)
    })
})

describe('MinesweeperGame — 모바일 롱프레스로 깃발 꽂기', () => {
    afterEach(() => {
        vi.useRealTimers()
    })

    // 깃발이 꽂히면 셀 버튼의 :key(revealed·flagged 상태 포함)가 바뀌어 엘리먼트가 리마운트된다
    // (MinesweeperBoard.vue의 reveal-pop 애니메이션 재생을 위한 의도된 설계) — 그래서 상호작용 전에
    // 잡아둔 wrapper 참조로 최종 상태를 읽지 않고, 매번 board에서 새로 찾아 읽는다.
    function firstCell(wrapper: ReturnType<typeof mount>) {
        return wrapper.findAll('[data-testid="board"] > button')[0]
    }

    it('칸을 500ms 이상 길게 누르면 열리지 않고 깃발이 꽂힌다', async () => {
        vi.useFakeTimers()
        const wrapper = mount(MinesweeperGame)

        await firstCell(wrapper).trigger('touchstart', {touches: [{clientX: 100, clientY: 100}]})
        // onFlag는 touchend가 아니라 500ms 타이머 만료 시점에 실행된다.
        await vi.advanceTimersByTimeAsync(600)

        expect(firstCell(wrapper).text()).toBe('🚩')
    })

    it('짧게 누르고 손을 떼면(롱프레스 미도달) 깃발이 꽂히지 않는다', async () => {
        vi.useFakeTimers()
        const wrapper = mount(MinesweeperGame)

        await firstCell(wrapper).trigger('touchstart', {touches: [{clientX: 100, clientY: 100}]})
        await vi.advanceTimersByTimeAsync(200) // 500ms 임계값에 못 미침
        await firstCell(wrapper).trigger('touchend')

        expect(firstCell(wrapper).text()).not.toBe('🚩')
    })

    it('누른 채로 크게 움직이면(스크롤 의도) 롱프레스가 취소되어 깃발이 꽂히지 않는다', async () => {
        vi.useFakeTimers()
        const wrapper = mount(MinesweeperGame)

        await firstCell(wrapper).trigger('touchstart', {touches: [{clientX: 100, clientY: 100}]})
        await firstCell(wrapper).trigger('touchmove', {touches: [{clientX: 100, clientY: 130}]}) // 30px 이동 (임계값 10px 초과)
        await vi.advanceTimersByTimeAsync(600)

        expect(firstCell(wrapper).text()).not.toBe('🚩')
    })
})
