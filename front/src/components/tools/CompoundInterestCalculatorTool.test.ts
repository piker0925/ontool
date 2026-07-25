import {describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import CompoundInterestCalculatorTool from './CompoundInterestCalculatorTool.vue'

describe('CompoundInterestCalculatorTool', () => {
    it('원금 1,000만원 / 연 6% / 12개월(월복리) → 이자 616,778원, 만기수령액 10,616,778원', async () => {
        const wrapper = mount(CompoundInterestCalculatorTool)
        const inputs = wrapper.findAll('input')
        await inputs[0].setValue('1000')
        await inputs[1].setValue(6)
        await inputs[2].setValue(12)
        expect(wrapper.text()).toContain('10,616,778원')
        expect(wrapper.text()).toContain('616,778원')
    })

    it('면책 문구와 기준연도가 항상 보임', () => {
        const wrapper = mount(CompoundInterestCalculatorTool)
        expect(wrapper.text()).toContain('참고용 계산이며 법적 효력이 없습니다')
        expect(wrapper.text()).toContain('2026년 기준')
    })
})
