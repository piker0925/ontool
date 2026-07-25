import {describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import IncomeTaxCalculatorTool from './IncomeTaxCalculatorTool.vue'

describe('IncomeTaxCalculatorTool', () => {
    it('과세표준 30,000,000원(기본값) → 종합소득세 3,240,000원, 지방소득세 324,000원, 합계 3,564,000원', () => {
        const wrapper = mount(IncomeTaxCalculatorTool)
        expect(wrapper.text()).toContain('3,240,000원')
        expect(wrapper.text()).toContain('324,000원')
        expect(wrapper.text()).toContain('3,564,000원')
    })

    it('과세표준을 100,000,000원으로 바꾸면 다른 세율 구간(35%)이 적용되어 결과가 달라짐', async () => {
        const wrapper = mount(IncomeTaxCalculatorTool)
        await wrapper.find('input').setValue('100000000')
        expect(wrapper.text()).toContain('19,560,000원')
    })

    it('면책 문구와 기준연도가 항상 보임', () => {
        const wrapper = mount(IncomeTaxCalculatorTool)
        expect(wrapper.text()).toContain('참고용 계산이며 법적 효력이 없습니다')
        expect(wrapper.text()).toContain('2026년 기준')
    })
})
