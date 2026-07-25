import {describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import AgeCalculatorTool from './AgeCalculatorTool.vue'

describe('AgeCalculatorTool', () => {
    it('로드 직후에는 생년월일이 비어 있어 "0세" 같은 의미 없는 결과가 보이지 않음', () => {
        const wrapper = mount(AgeCalculatorTool)
        expect(wrapper.text()).not.toContain('0세')
        expect(wrapper.text()).toContain('생년월일')
    })

    it('생년월일을 입력하면 만 나이 결과가 나타남', async () => {
        const wrapper = mount(AgeCalculatorTool)
        const birthInput = wrapper.findAll('input[type="date"]')[0]
        await birthInput.setValue('2000-01-01')
        expect(wrapper.text()).toMatch(/\d+세/)
    })
})
