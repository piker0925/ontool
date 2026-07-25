import {describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import WordGuessGame from './WordGuessGame.vue'

describe('WordGuessGame', () => {
    it('글자 수가 안 맞으면 제출 버튼이 비활성화된다', async () => {
        const wrapper = mount(WordGuessGame)
        const input = wrapper.find('[data-testid="guess-input"]')
        await input.setValue('가')
        expect((wrapper.find('[data-testid="guess-submit"]').element as HTMLButtonElement).disabled).toBe(true)
    })

    it('오답을 제출하면 결과 타일이 표시되고 입력창이 비워진다', async () => {
        const wrapper = mount(WordGuessGame)
        const input = wrapper.find('[data-testid="guess-input"]')
        await input.setValue('가나')
        await wrapper.find('form').trigger('submit')

        expect(wrapper.find('[data-testid="row-0"]').exists()).toBe(true)
        expect((wrapper.find('[data-testid="guess-input"]').element as HTMLInputElement).value).toBe('')
    })

    it('시도를 반복해도 정답을 못 맞히면 결국 게임이 끝나고 정답이 공개된다', async () => {
        const wrapper = mount(WordGuessGame)
        // '가나'는 목록에 등록된 정답 후보가 아니므로 6번 넣으면 확실히 오답으로 소진된다.
        for (let i = 0; i < 6; i++) {
            await wrapper.find('[data-testid="guess-input"]').setValue('가나')
            await wrapper.find('form').trigger('submit')
        }
        expect(wrapper.find('[data-testid="game-result"]').exists()).toBe(true)
        expect(wrapper.find('[data-testid="answer-reveal"]').text()).toContain('정답:')
        expect(wrapper.find('[data-testid="guess-input"]').exists()).toBe(false)
    })
})
