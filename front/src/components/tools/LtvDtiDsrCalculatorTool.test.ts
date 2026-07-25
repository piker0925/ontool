import {describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import LtvDtiDsrCalculatorTool from './LtvDtiDsrCalculatorTool.vue'

describe('LtvDtiDsrCalculatorTool', () => {
    it('기본값(대출 3.5억/담보 5억/연소득 5,500만/주담대상환 2,000만/기타이자 200만/총부채상환 2,500만)으로 LTV 70.0%, DTI 40.0%, DSR 45.5%가 서로 다르게 보임', () => {
        const wrapper = mount(LtvDtiDsrCalculatorTool)
        const values = wrapper.findAll('.text-zone-accent-life').map(el => el.text())
        expect(values).toEqual(['70.0%', '40.0%', '45.5%'])
    })

    it('면책 문구와 정책 유동성 안내, 기준연도가 항상 보임', () => {
        const wrapper = mount(LtvDtiDsrCalculatorTool)
        expect(wrapper.text()).toContain('정책별 실제 한도는 계속 바뀌므로')
        expect(wrapper.text()).toContain('참고용 계산이며 법적 효력이 없습니다')
        expect(wrapper.text()).toContain('2026년 기준')
    })
})
