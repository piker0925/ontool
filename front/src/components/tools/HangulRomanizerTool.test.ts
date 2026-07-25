import {describe, expect, it, vi} from 'vitest'
import {mount} from '@vue/test-utils'
import HangulRomanizerTool from './HangulRomanizerTool.vue'

describe('HangulRomanizerTool', () => {
    it('성/이름을 입력하면 국립국어원 표기법 기준 로마자 결과가 나타난다', async () => {
        const wrapper = mount(HangulRomanizerTool)
        const inputs = wrapper.findAll('input[type="text"]')
        await inputs[0].setValue('홍')
        await inputs[1].setValue('빛나')
        expect(wrapper.text()).toContain('Hong Bitna')
    })

    it('복사 버튼을 누르면 결과를 클립보드에 복사한다', async () => {
        const writeText = vi.fn()
        Object.assign(navigator, {clipboard: {writeText}})

        const wrapper = mount(HangulRomanizerTool)
        const inputs = wrapper.findAll('input[type="text"]')
        await inputs[0].setValue('홍')
        await inputs[1].setValue('빛나')

        const copyButton = wrapper.find('button[aria-label="결과 복사"]')
        await copyButton.trigger('click')
        expect(writeText).toHaveBeenCalledWith('Hong Bitna')
    })
})
