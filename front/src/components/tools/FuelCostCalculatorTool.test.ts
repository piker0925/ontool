import {describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import FuelCostCalculatorTool from './FuelCostCalculatorTool.vue'

describe('FuelCostCalculatorTool', () => {
    it('거리 300km / 연비 12km/L / 유가 1,700원 입력 시 유류비 42,500원, 사용량 25.0L가 보임', async () => {
        const wrapper = mount(FuelCostCalculatorTool)
        const inputs = wrapper.findAll('input')
        await inputs[0].setValue(300)
        await inputs[1].setValue(12)
        await inputs[2].setValue(1700)
        expect(wrapper.text()).toContain('42,500원')
        expect(wrapper.text()).toContain('25.0L')
    })

    it('면책 문구가 항상 보임', () => {
        const wrapper = mount(FuelCostCalculatorTool)
        expect(wrapper.text()).toContain('참고용 계산입니다')
    })
})
