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

    it('166: 게임 오버 오버레이 안 재시작 버튼이 캔버스 액션 게임에서도 정상 동작한다', async () => {
        const wrapper = mount(TowerStackGame)
        // 위 "완전히 빗나간 타이밍" 테스트와 동일한 조건으로 곧장 게임 오버를 만든다.
        await vi.advanceTimersByTimeAsync(1600)
        await wrapper.find('[data-testid="canvas"]').trigger('click')
        expect(wrapper.find('[data-testid="game-over"]').exists()).toBe(true)

        await wrapper.find('[data-testid="game-result-restart"]').trigger('click')

        expect(wrapper.find('[data-testid="game-over"]').exists()).toBe(false)
        expect(wrapper.find('[data-testid="score"]').text()).toBe('0')

        // 재마운트 후 다시 정확한 타이밍(800ms)에 클릭하면 정상적으로 점수가 오른다 —
        // 재시작이 진짜로 새 게임 인스턴스를 만든 것이지, 죽은 상태를 흉내만 낸 게 아님을 확인한다.
        await vi.advanceTimersByTimeAsync(800)
        await wrapper.find('[data-testid="canvas"]').trigger('click')
        expect(wrapper.find('[data-testid="score"]').text()).toBe('1')
    })
})
