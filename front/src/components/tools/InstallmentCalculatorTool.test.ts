import {describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import InstallmentCalculatorTool from './InstallmentCalculatorTool.vue'

describe('InstallmentCalculatorTool', () => {
    it('이용원금 120만원 / 연 수수료율 12% / 6개월 → 월 할부금 207,058원, 총수수료 42,348원, 총납부액 1,242,348원', async () => {
        const wrapper = mount(InstallmentCalculatorTool)
        const inputs = wrapper.findAll('input')
        await inputs[0].setValue('120')
        await inputs[1].setValue(12)
        await inputs[2].setValue(6)
        expect(wrapper.text()).toContain('207,058원')
        expect(wrapper.text()).toContain('42,348원')
        expect(wrapper.text()).toContain('1,242,348원')
    })

    it('면책 문구와 기준연도가 항상 보임', () => {
        const wrapper = mount(InstallmentCalculatorTool)
        expect(wrapper.text()).toContain('참고용 계산이며 법적 효력이 없습니다')
        expect(wrapper.text()).toContain('2026년 기준')
    })
})
