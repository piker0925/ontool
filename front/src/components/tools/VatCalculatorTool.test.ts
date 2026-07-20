import {describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import VatCalculatorTool from './VatCalculatorTool.vue'

describe('VatCalculatorTool', () => {
    it('공급가액 100만원 입력 시 부가세 10만원, 합계 110만원이 함께 보임', async () => {
        const wrapper = mount(VatCalculatorTool)
        await wrapper.findAll('input')[0].setValue('100')
        expect(wrapper.text()).toContain('100,000원') // 부가세
        expect(wrapper.text()).toContain('1,000,000원') // 공급가액
        expect(wrapper.text()).toContain('1,100,000원') // 합계
    })

    it('방향을 "부가세 포함가 → 공급가액"으로 바꾸면 110만원 입력 시 공급가액이 100만원으로 정확히 역산됨', async () => {
        const wrapper = mount(VatCalculatorTool)
        await wrapper.find('select').setValue('total-to-supply')
        await wrapper.findAll('input')[0].setValue('110')
        expect(wrapper.text()).toContain('1,000,000원') // 공급가액
    })

    it('면책 문구와 기준연도가 항상 보임', () => {
        const wrapper = mount(VatCalculatorTool)
        expect(wrapper.text()).toContain('참고용 계산이며 법적 효력이 없습니다')
        expect(wrapper.text()).toContain('2026년 기준')
    })
})
