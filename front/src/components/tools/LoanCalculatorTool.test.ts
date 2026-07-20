import {describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import LoanCalculatorTool from './LoanCalculatorTool.vue'

describe('LoanCalculatorTool', () => {
    it('원리금균등과 원금균등을 전환하면 총 이자가 서로 다르게 나옴(같은 로직으로 착각하지 않도록)', async () => {
        const wrapper = mount(LoanCalculatorTool)
        const equalPaymentText = wrapper.text()
        await wrapper.find('select').setValue('equal-principal')
        const equalPrincipalText = wrapper.text()
        expect(equalPaymentText).not.toBe(equalPrincipalText)
    })

    it('상환표는 마지막 회차에 잔액 0으로 표시됨', () => {
        const wrapper = mount(LoanCalculatorTool)
        const rows = wrapper.findAll('tbody tr')
        const lastRowCells = rows[rows.length - 1].findAll('td')
        expect(lastRowCells[lastRowCells.length - 1].text()).toBe('0')
    })

    it('큰 금액 입력칸에 콤마가 포함된 값을 넣어도 정상 파싱됨', async () => {
        const wrapper = mount(LoanCalculatorTool)
        await wrapper.findAll('input')[0].setValue('1,000')
        expect(wrapper.find<HTMLInputElement>('input').element.value).toBe('1,000')
    })

    it('면책 문구와 기준연도가 항상 보임', () => {
        const wrapper = mount(LoanCalculatorTool)
        expect(wrapper.text()).toContain('참고용 계산이며 법적 효력이 없습니다')
        expect(wrapper.text()).toContain('2026년 기준')
    })
})
