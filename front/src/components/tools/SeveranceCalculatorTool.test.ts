import {describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import SeveranceCalculatorTool from './SeveranceCalculatorTool.vue'

describe('SeveranceCalculatorTool', () => {
    it('입사일·퇴사일을 입력하면 재직일수가 자동 계산됨(직접 일수를 세지 않아도 됨)', async () => {
        const wrapper = mount(SeveranceCalculatorTool)
        const dateInputs = wrapper.findAll('input[type="date"]')
        await dateInputs[0].setValue('2025-01-01')
        await dateInputs[1].setValue('2025-12-31')
        expect(wrapper.text()).toContain('365일')
    })

    it('퇴사일이 입사일보다 빠르면 경고가 뜨고 재직일수가 0으로 안전하게 처리됨', async () => {
        const wrapper = mount(SeveranceCalculatorTool)
        const dateInputs = wrapper.findAll('input[type="date"]')
        await dateInputs[0].setValue('2025-12-31')
        await dateInputs[1].setValue('2025-01-01')
        expect(wrapper.text()).toContain('퇴사일이 입사일보다 빠릅니다')
        expect(wrapper.text()).toContain('0일')
    })

    it('상여금·연차수당 선택 입력은 기본적으로 접혀 있음(불필요한 필드로 화면을 채우지 않음)', () => {
        const wrapper = mount(SeveranceCalculatorTool)
        const details = wrapper.find('details')
        expect(details.attributes('open')).toBeUndefined()
    })

    it('면책 문구와 기준연도가 항상 보임', () => {
        const wrapper = mount(SeveranceCalculatorTool)
        expect(wrapper.text()).toContain('참고용 계산이며 법적 효력이 없습니다')
        expect(wrapper.text()).toContain('2026년 기준')
    })
})
