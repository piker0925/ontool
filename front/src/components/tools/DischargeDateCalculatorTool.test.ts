import {describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import DischargeDateCalculatorTool from './DischargeDateCalculatorTool.vue'

describe('DischargeDateCalculatorTool', () => {
    it('입대일 2024-01-01, 복무기간 18개월 입력 시 전역일 2025-06-30이 보임', async () => {
        const wrapper = mount(DischargeDateCalculatorTool)
        await wrapper.find('input[type="date"]').setValue('2024-01-01')
        await wrapper.find('input[type="number"]').setValue(18)
        expect(wrapper.text()).toContain('2025-06-30')
    })

    it('복무기간을 바꾸면 전역일도 그에 맞게 달라짐', async () => {
        const wrapper = mount(DischargeDateCalculatorTool)
        await wrapper.find('input[type="date"]').setValue('2024-01-01')
        await wrapper.find('input[type="number"]').setValue(6)
        expect(wrapper.text()).toContain('2024-06-30')
        expect(wrapper.text()).not.toContain('2025-06-30')
    })
})
