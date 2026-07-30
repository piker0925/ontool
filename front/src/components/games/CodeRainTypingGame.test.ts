import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {mount} from '@vue/test-utils'
import CodeRainTypingGame from './CodeRainTypingGame.vue'

describe('CodeRainTypingGame', () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })
    afterEach(() => {
        vi.useRealTimers()
    })

    it('팩을 선택하고 떨어지는 단어를 정확히 입력하면 점수가 오른다', async () => {
        const wrapper = mount(CodeRainTypingGame)
        await wrapper.find('[data-testid="pack-java"]').trigger('click')
        await vi.advanceTimersByTimeAsync(1900) // 스폰 간격(1800ms)이 지나 단어가 하나 등장한다

        const word = wrapper.findAll('[data-testid^="word-"]')[0]
        expect(word).toBeTruthy()
        const input = wrapper.find('[data-testid="word-input"]')
        await input.setValue(word!.text())
        await input.trigger('keyup.enter')

        expect(wrapper.find('[data-testid="score"]').text()).toBe('1')
    })

    it('일치하지 않는 단어를 입력하면 점수가 오르지 않는다', async () => {
        const wrapper = mount(CodeRainTypingGame)
        await wrapper.find('[data-testid="pack-java"]').trigger('click')
        await vi.advanceTimersByTimeAsync(1900)

        const input = wrapper.find('[data-testid="word-input"]')
        await input.setValue('절대-존재하지-않는-단어')
        await input.trigger('keyup.enter')

        expect(wrapper.find('[data-testid="score"]').text()).toBe('0')
    })

    it('라이프가 모두 소진되면 게임오버 화면과 최종 점수가 표시된다', async () => {
        const wrapper = mount(CodeRainTypingGame)
        await wrapper.find('[data-testid="pack-java"]').trigger('click')
        // 아무 입력도 하지 않고 충분히 시간을 흘려 단어들이 그대로 바닥에 떨어지게 둔다
        await vi.advanceTimersByTimeAsync(60000)

        expect(wrapper.find('[data-testid="game-over"]').exists()).toBe(true)
        expect(wrapper.find('[data-testid="final-score"]').exists()).toBe(true)
    })
})
