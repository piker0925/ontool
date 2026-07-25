import {describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import DdayCalculatorTool from './DdayCalculatorTool.vue'

describe('DdayCalculatorTool', () => {
    it('로드 직후에는 목표일이 비어 있어 "D-DAY" 같은 의미 없는 결과가 보이지 않음', () => {
        const wrapper = mount(DdayCalculatorTool)
        expect(wrapper.text()).not.toContain('D-DAY')
        expect(wrapper.text()).toContain('목표일')
    })

    it('목표일을 입력하면 D-Day 결과가 나타남', async () => {
        const wrapper = mount(DdayCalculatorTool)
        const targetInput = wrapper.findAll('input[type="date"]')[1]
        await targetInput.setValue('2030-01-01')
        expect(wrapper.text()).toMatch(/D[-+]\d+|D-DAY/)
        expect(wrapper.text()).toContain('일 차이')
    })
})
