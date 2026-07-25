import {describe, expect, it, vi} from 'vitest'
import {mount} from '@vue/test-utils'
import SpecialCharPickerTool from './SpecialCharPickerTool.vue'
import {SPECIAL_CHAR_CATEGORIES} from '../../utils/specialChars'

describe('SpecialCharPickerTool', () => {
    it('문자를 클릭하면 정확한 문자열을 클립보드에 복사한다', async () => {
        const writeText = vi.fn()
        Object.assign(navigator, {clipboard: {writeText}})

        const wrapper = mount(SpecialCharPickerTool)
        const firstChar = SPECIAL_CHAR_CATEGORIES[0].chars[0]
        const button = wrapper.findAll('button').find(b => b.text() === firstChar)
        expect(button).toBeTruthy()

        await button!.trigger('click')
        expect(writeText).toHaveBeenCalledWith(firstChar)
    })

    it('클릭 후 복사됨 피드백을 보여준다', async () => {
        Object.assign(navigator, {clipboard: {writeText: vi.fn()}})
        const wrapper = mount(SpecialCharPickerTool)
        const firstChar = SPECIAL_CHAR_CATEGORIES[0].chars[0]
        const button = wrapper.findAll('button').find(b => b.text() === firstChar)
        await button!.trigger('click')
        expect(wrapper.text()).toContain('복사됨')
    })

    it('카테고리 탭을 전환하면 다른 카테고리의 문자가 표시된다', async () => {
        const wrapper = mount(SpecialCharPickerTool)
        const secondCategory = SPECIAL_CHAR_CATEGORIES[1]
        const tab = wrapper.findAll('[role="tab"], button').find(b => b.text() === secondCategory.label)
        expect(tab).toBeTruthy()
        await tab!.trigger('click')
        expect(wrapper.text()).toContain(secondCategory.chars[0])
    })
})
