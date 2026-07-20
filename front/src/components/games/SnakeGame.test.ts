import {beforeEach, describe, expect, it, vi} from 'vitest'
import {mount} from '@vue/test-utils'
import {nextTick} from 'vue'
import SnakeGame from './SnakeGame.vue'

beforeEach(() => {
    // jsdom은 canvas 2d 컨텍스트를 구현하지 않는다 — 렌더 배선 통과용 최소 스텁.
    ;(HTMLCanvasElement.prototype as unknown as { getContext: () => object }).getContext = () => ({
        clearRect: () => {},
        fillRect: () => {},
        fillStyle: '',
    })
})

describe('SnakeGame — 시작 전 대기', () => {
    it('시작 버튼을 누르기 전에는 뱀이 움직이지 않는다(플레이어가 반응할 시간 없이 벽에 부딪혀 즉사하지 않음)', async () => {
        vi.useFakeTimers()
        try {
            const wrapper = mount(SnakeGame)
            await vi.advanceTimersByTimeAsync(3000) // 시작 안 누른 채 3초가 지나도

            expect(wrapper.find('[data-testid="game-over"]').exists()).toBe(false)
            expect(wrapper.find('[data-testid="snake-start"]').exists()).toBe(true)
        } finally {
            vi.useRealTimers()
        }
    })
})

describe('SnakeGame — 포커스', () => {
    it('시작 버튼을 누르면 버튼이 사라져도 방향키를 계속 받을 수 있도록 게임 영역으로 포커스가 돌아온다', async () => {
        const wrapper = mount(SnakeGame, {attachTo: document.body})
        try {
            await wrapper.find('[data-testid="snake-start"]').trigger('click')
            await nextTick()

            // 시작 버튼(포커스를 가졌던 요소)은 사라졌고, keydown을 처리하는 tabindex=0 컨테이너로
            // 포커스가 돌아와 있어야 한다 — 그렇지 않으면(예: body로 밀림) 방향키가 씹힌다.
            expect(wrapper.find('[data-testid="snake-start"]').exists()).toBe(false)
            expect(document.activeElement?.getAttribute('tabindex')).toBe('0')
        } finally {
            wrapper.unmount()
        }
    })
})

describe('SnakeGame — 재시작', () => {
    it('몇 틱 진행한 뒤 다시 시작하면 뱀이 초기 위치·점수로 되돌아간다(시작 전 대기 상태)', async () => {
        vi.useFakeTimers()
        try {
            const wrapper = mount(SnakeGame)
            await wrapper.find('[data-testid="snake-start"]').trigger('click')
            await vi.advanceTimersByTimeAsync(600) // TICK_MS(150) 여러 번 지나 머리가 움직임

            await wrapper.find('[data-testid="game-restart"]').trigger('click')

            expect(wrapper.find('[data-testid="score"]').text()).toBe('0')
            expect(wrapper.find('[data-testid="snake-start"]').exists()).toBe(true)
        } finally {
            vi.useRealTimers()
        }
    })
})
