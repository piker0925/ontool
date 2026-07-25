import {describe, expect, it, vi} from 'vitest'
import {mount} from '@vue/test-utils'
import GameResultOverlay from './GameResultOverlay.vue'

describe('GameResultOverlay — 166: 오버레이 안 재시작 버튼', () => {
    it('restart를 넘기면 오버레이 안에 재시작 버튼이 보이고, 클릭하면 정확히 그 함수가 호출된다', async () => {
        const restart = vi.fn()
        const wrapper = mount(GameResultOverlay, {
            props: {show: true, title: '게임 오버!', tone: 'lose', restart},
        })

        const button = wrapper.find('[data-testid="game-result-restart"]')
        expect(button.exists()).toBe(true)

        await button.trigger('click')
        expect(restart).toHaveBeenCalledTimes(1)
    })

    it('restart를 넘기지 않으면 재시작 버튼이 아예 렌더링되지 않는다', () => {
        const wrapper = mount(GameResultOverlay, {
            props: {show: true, title: '게임 오버!', tone: 'lose'},
        })

        expect(wrapper.find('[data-testid="game-result-restart"]').exists()).toBe(false)
    })

    it('show가 false면 restart를 넘겨도 오버레이 자체가(재시작 버튼 포함) 렌더링되지 않는다', () => {
        const restart = vi.fn()
        const wrapper = mount(GameResultOverlay, {
            props: {show: false, title: '게임 오버!', tone: 'lose', restart},
        })

        expect(wrapper.find('[data-testid="game-result-restart"]').exists()).toBe(false)
    })
})
