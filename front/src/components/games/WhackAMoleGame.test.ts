import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {mount} from '@vue/test-utils'
import WhackAMoleGame from './WhackAMoleGame.vue'

describe('WhackAMoleGame', () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })
    afterEach(() => {
        vi.useRealTimers()
    })

    it('시간이 지나 두더지가 등장하면 클릭해서 점수를 올릴 수 있다', async () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.8)
        const wrapper = mount(WhackAMoleGame)
        await vi.advanceTimersByTimeAsync(100)

        const activeHole = wrapper.findAll('[data-testid^="hole-"]').find(h => h.text().trim().length > 0)
        expect(activeHole).toBeTruthy()
        await activeHole!.trigger('click')

        expect(Number(wrapper.find('[data-testid="score"]').text())).toBeGreaterThanOrEqual(1)
    })

    it('30초가 지나면 게임이 종료되고 최종 점수가 표시된다', async () => {
        const wrapper = mount(WhackAMoleGame)
        await vi.advanceTimersByTimeAsync(30100)

        expect(wrapper.find('[data-testid="game-over"]').exists()).toBe(true)
        expect(wrapper.find('[data-testid="time-left"]').text()).toBe('0초')
    })
})
