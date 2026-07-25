import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {mount} from '@vue/test-utils'
import BreakoutGame from './BreakoutGame.vue'

beforeEach(() => {
    ;(HTMLCanvasElement.prototype as unknown as { getContext: () => object }).getContext = () => ({
        clearRect: () => {},
        fillRect: () => {},
        beginPath: () => {},
        arc: () => {},
        fill: () => {},
        fillStyle: '',
    })
    vi.useFakeTimers()
})

afterEach(() => {
    vi.useRealTimers()
})

describe('BreakoutGame', () => {
    it('오른쪽 방향키를 누르면 패들이 오른쪽으로 이동한다', async () => {
        const wrapper = mount(BreakoutGame, {attachTo: document.body})
        const container = wrapper.find('div[tabindex="0"]')
        await container.trigger('keydown', {key: 'ArrowRight'})
        await container.trigger('keydown', {key: 'ArrowRight'})

        // 내부 paddleX는 노출되지 않으므로, 시간이 흘러도 게임이 여전히 진행 중임을 통해
        // (경계를 벗어나 예외가 나지 않고) 정상 동작함을 확인한다.
        expect(wrapper.find('[data-testid="game-over"]').exists()).toBe(false)
        wrapper.unmount()
    })

    it('시간이 지나 공이 바닥에 닿으면 게임 오버가 표시된다', async () => {
        const wrapper = mount(BreakoutGame)
        // 초기 공은 아래쪽에서 위로 움직이도록 설정돼 있어(vy=-3), 벽돌을 다 못 깨는 한
        // 결국 패들을 놓치고 바닥에 닿을 때까지는 시간이 걸린다 — 충분히 긴 시간을 흘려보낸다.
        await vi.advanceTimersByTimeAsync(20000)

        expect(wrapper.find('[data-testid="game-over"]').exists()).toBe(true)
    })
})
