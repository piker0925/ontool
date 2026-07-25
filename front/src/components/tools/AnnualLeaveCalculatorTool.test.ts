import {describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import AnnualLeaveCalculatorTool from './AnnualLeaveCalculatorTool.vue'

describe('AnnualLeaveCalculatorTool', () => {
    it('근속 6개월 입력 시 6일이 보임(1년 미만은 개근 개월마다 1일)', async () => {
        const wrapper = mount(AnnualLeaveCalculatorTool)
        await wrapper.find('input').setValue(6)
        expect(wrapper.find('.text-zone-accent-life').text()).toBe('6일')
    })

    it('근속 36개월(3년차) 입력 시 16일이 보임(15일 + 가산 1일)', async () => {
        const wrapper = mount(AnnualLeaveCalculatorTool)
        await wrapper.find('input').setValue(36)
        expect(wrapper.find('.text-zone-accent-life').text()).toBe('16일')
    })

    it('근속 40년(480개월) 입력해도 최대 25일에서 더 오르지 않음(설명 문구의 "최대 25일"이 아니라 실제 결과 요소를 확인)', async () => {
        const wrapper = mount(AnnualLeaveCalculatorTool)
        await wrapper.find('input').setValue(480)
        expect(wrapper.find('.text-zone-accent-life').text()).toBe('25일')
    })

    it('면책 문구와 기준연도가 항상 보임', () => {
        const wrapper = mount(AnnualLeaveCalculatorTool)
        expect(wrapper.text()).toContain('참고용 계산이며 법적 효력이 없습니다')
        expect(wrapper.text()).toContain('2026년 기준')
    })
})
