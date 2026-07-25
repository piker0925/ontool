import {describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import SavingsGoalCalculatorTool from './SavingsGoalCalculatorTool.vue'

describe('SavingsGoalCalculatorTool', () => {
    it('목표 1,278만원 / 연 12% / 12개월 → 매월 필요 저축액 1,000,000원', async () => {
        const wrapper = mount(SavingsGoalCalculatorTool)
        const inputs = wrapper.findAll('input')
        await inputs[0].setValue('1278')
        await inputs[1].setValue(12)
        await inputs[2].setValue(12)
        expect(wrapper.text()).toContain('1,000,000원')
    })

    it('이자율을 0으로 바꾸면 목표금액을 개월수로 균등 분할한 값과 같음(1,200만원 / 12개월 = 100만원)', async () => {
        const wrapper = mount(SavingsGoalCalculatorTool)
        const inputs = wrapper.findAll('input')
        await inputs[0].setValue('1200')
        await inputs[1].setValue(0)
        await inputs[2].setValue(12)
        expect(wrapper.text()).toContain('1,000,000원')
    })

    it('면책 문구와 기준연도가 항상 보임', () => {
        const wrapper = mount(SavingsGoalCalculatorTool)
        expect(wrapper.text()).toContain('참고용 계산이며 법적 효력이 없습니다')
        expect(wrapper.text()).toContain('2026년 기준')
    })
})
