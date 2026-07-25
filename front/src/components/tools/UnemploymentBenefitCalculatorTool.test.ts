import {describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import UnemploymentBenefitCalculatorTool from './UnemploymentBenefitCalculatorTool.vue'

describe('UnemploymentBenefitCalculatorTool', () => {
    it('기본값(평균임금 112,000원 · 30세 · 가입 25개월)으로 1일 67,200원 × 150일 = 10,080,000원이 보임', () => {
        const wrapper = mount(UnemploymentBenefitCalculatorTool)
        expect(wrapper.text()).toContain('67,200원')
        expect(wrapper.text()).toContain('150일')
        expect(wrapper.text()).toContain('10,080,000원')
    })

    it('연령을 50세로 바꾸면 같은 가입기간이라도 고령자 표를 적용해 소정급여일수가 달라짐', async () => {
        const wrapper = mount(UnemploymentBenefitCalculatorTool)
        const inputs = wrapper.findAll('input')
        await inputs[1].setValue(55)
        expect(wrapper.text()).not.toContain('150일')
    })

    it('면책 문구와 기준연도가 항상 보임', () => {
        const wrapper = mount(UnemploymentBenefitCalculatorTool)
        expect(wrapper.text()).toContain('참고용 계산이며 법적 효력이 없습니다')
        expect(wrapper.text()).toContain('2026년 기준')
    })
})
