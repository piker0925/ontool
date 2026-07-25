import {describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import KeyboardTypoFixerTool from './KeyboardTypoFixerTool.vue'

describe('KeyboardTypoFixerTool', () => {
    it('영문으로 잘못 입력한 한글 오타를 자동 감지해 한글로 되돌린다', async () => {
        const wrapper = mount(KeyboardTypoFixerTool)
        const textarea = wrapper.find('textarea')
        await textarea.setValue('dkssud')
        expect(wrapper.text()).toContain('안녕')
        expect(wrapper.text()).toContain('영타') // 자동 감지된 방향 표시
    })

    it('한글로 잘못 입력한 영문 오타를 자동 감지해 영문으로 되돌린다', async () => {
        const wrapper = mount(KeyboardTypoFixerTool)
        const textarea = wrapper.find('textarea')
        await textarea.setValue('안녕')
        expect(wrapper.text()).toContain('dkssud')
        expect(wrapper.text()).toContain('한타') // 자동 감지된 방향 표시
    })
})
