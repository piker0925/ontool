import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {mount} from '@vue/test-utils'
import TowerStackGame from './TowerStackGame.vue'

beforeEach(() => {
    // jsdom은 canvas 2d 컨텍스트를 구현하지 않는다 — 렌더 배선 통과용 최소 스텁.
    ;(HTMLCanvasElement.prototype as unknown as { getContext: () => object }).getContext = () => ({
        clearRect: () => {},
        fillRect: () => {},
        fillStyle: '',
    })
    vi.useFakeTimers()
})

afterEach(() => {
    vi.useRealTimers()
})

describe('TowerStackGame', () => {
    it('현재 블록이 바로 아래 블록과 완전히 겹치는 타이밍에 클릭하면 점수가 오른다', async () => {
        const wrapper = mount(TowerStackGame)
        // 초기 속도(2px/tick)로 800ms(=50틱) 지나면 x=100 — 중앙(100~200)에 있는 기반 블록과
        // 정확히 겹친다(현재 블록 너비도 100이라 완전 일치).
        await vi.advanceTimersByTimeAsync(800)
        await wrapper.find('[data-testid="canvas"]').trigger('click')

        expect(wrapper.find('[data-testid="score"]').text()).toBe('1')
        expect(wrapper.find('[data-testid="game-over"]').exists()).toBe(false)
    })

    it('완전히 빗나간 타이밍에 클릭하면 게임 오버가 된다', async () => {
        const wrapper = mount(TowerStackGame)
        // 1600ms(=100틱) 지나면 x가 오른쪽 끝(200)에 닿아 기반 블록(100~200)과 겹침이 0이 된다.
        await vi.advanceTimersByTimeAsync(1600)
        await wrapper.find('[data-testid="canvas"]').trigger('click')

        expect(wrapper.find('[data-testid="game-over"]').exists()).toBe(true)
        expect(wrapper.find('[data-testid="score"]').text()).toBe('0')
    })
})
