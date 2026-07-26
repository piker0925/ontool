import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {mount} from '@vue/test-utils'
import RouteLoadingBar from './RouteLoadingBar.vue'
import {SHOW_DELAY_MS, __resetRouteLoadingBarForTest, useRouteLoadingBar} from '../composables/useRouteLoadingBar'

describe('RouteLoadingBar', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        __resetRouteLoadingBarForTest()
    })

    afterEach(() => {
        __resetRouteLoadingBarForTest()
        vi.useRealTimers()
    })

    it('빠르게 끝나는 전환(SHOW_DELAY_MS 이전 finish)에서는 바 엘리먼트를 렌더링하지 않는다', async () => {
        const {start, finish} = useRouteLoadingBar()
        const wrapper = mount(RouteLoadingBar)

        start()
        vi.advanceTimersByTime(SHOW_DELAY_MS - 1)
        finish()
        await vi.runAllTimersAsync()
        await wrapper.vm.$nextTick()

        expect(wrapper.find('[data-testid="route-loading-bar"]').exists()).toBe(false)
    })

    it('SHOW_DELAY_MS를 넘겨 진행 중인 전환에서는 바를 렌더링하고 진행률에 맞춰 폭을 넓힌다', async () => {
        const {start} = useRouteLoadingBar()
        const wrapper = mount(RouteLoadingBar)

        start()
        vi.advanceTimersByTime(SHOW_DELAY_MS + 200) // 노출 + 트리클 한 틱
        await wrapper.vm.$nextTick()

        const bar = wrapper.find('[data-testid="route-loading-bar"]')
        expect(bar.exists()).toBe(true)
        const fill = bar.element.firstElementChild as HTMLElement
        expect(fill.style.width).not.toBe('0%')
    })
})
