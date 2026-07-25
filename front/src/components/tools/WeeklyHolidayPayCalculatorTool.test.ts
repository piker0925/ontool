import {describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import WeeklyHolidayPayCalculatorTool from './WeeklyHolidayPayCalculatorTool.vue'

describe('WeeklyHolidayPayCalculatorTool', () => {
    it('소정근로시간 40시간 / 시급 10,320원(기본값) → 주휴수당 82,560원', () => {
        const wrapper = mount(WeeklyHolidayPayCalculatorTool)
        expect(wrapper.text()).toContain('82,560원')
    })

    it('소정근로시간을 14시간으로 낮추면 경고가 뜨고 주휴수당 0원', async () => {
        const wrapper = mount(WeeklyHolidayPayCalculatorTool)
        await wrapper.find('input[type="number"]').setValue(14)
        expect(wrapper.text()).toContain('15시간 미만')
        expect(wrapper.text()).toContain('0원')
    })

    it('면책 문구와 기준연도가 항상 보임', () => {
        const wrapper = mount(WeeklyHolidayPayCalculatorTool)
        expect(wrapper.text()).toContain('참고용 계산이며 법적 효력이 없습니다')
        expect(wrapper.text()).toContain('2026년 기준')
    })
})
