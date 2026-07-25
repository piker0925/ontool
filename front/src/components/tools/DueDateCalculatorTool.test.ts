import {describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import DueDateCalculatorTool from './DueDateCalculatorTool.vue'

describe('DueDateCalculatorTool', () => {
    it('로드 직후에는 최종 월경일이 비어 있어 "임신 0주 0일" 같은 의미 없는 결과가 보이지 않음', () => {
        const wrapper = mount(DueDateCalculatorTool)
        expect(wrapper.text()).not.toContain('임신 0주 0일')
        expect(wrapper.text()).toContain('최종 월경일')
    })

    it('최종 월경일을 입력하면 출산예정일과 임신 주수 결과가 나타남', async () => {
        const wrapper = mount(DueDateCalculatorTool)
        const lmpInput = wrapper.find('input[type="date"]')
        await lmpInput.setValue('2026-01-01')
        expect(wrapper.text()).toMatch(/\d{4}-\d{2}-\d{2}/)
        expect(wrapper.text()).toMatch(/임신 \d+주 \d+일/)
    })
})
