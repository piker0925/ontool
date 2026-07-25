import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {mount} from '@vue/test-utils'
import ObstacleDodgeGame from './ObstacleDodgeGame.vue'

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

describe('ObstacleDodgeGame', () => {
    it('아무 입력 없이 두면 중력으로 떨어져 결국 충돌해 게임 오버가 된다', async () => {
        const wrapper = mount(ObstacleDodgeGame)
        // 순수 낙하 궤적은 파이프 배치의 무작위성과 무관하게 항상 바닥에 먼저 닿는다(약 480ms).
        await vi.advanceTimersByTimeAsync(1000)

        expect(wrapper.find('[data-testid="game-over"]').exists()).toBe(true)
    })

    it('클릭하면 점프해서 즉시 게임 오버가 되지는 않는다(짧은 시간 동안 생존)', async () => {
        const wrapper = mount(ObstacleDodgeGame)
        await wrapper.find('[data-testid="canvas"]').trigger('click')
        await vi.advanceTimersByTimeAsync(100)

        expect(wrapper.find('[data-testid="game-over"]').exists()).toBe(false)
    })
})
