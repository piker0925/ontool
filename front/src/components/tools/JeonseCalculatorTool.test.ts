import {describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import JeonseCalculatorTool from './JeonseCalculatorTool.vue'

describe('JeonseCalculatorTool', () => {
    it('보증금 차액 12,000만원(1.2억)을 전환율 5%로 월세 전환 후 역방향으로 바꾸면 같은 크기의 원값으로 돌아옴(라운드트립)', async () => {
        const wrapper = mount(JeonseCalculatorTool)
        const inputs = wrapper.findAll('input')
        await inputs[0].setValue('12000') // 보증금 차액 12,000만원 = 1.2억원
        await inputs[1].setValue('5') // 전환율 5%
        expect(wrapper.text()).toContain('500,000원') // 월세

        await wrapper.find('select').setValue('rent-to-deposit')
        const inputsAfter = wrapper.findAll('input')
        await inputsAfter[0].setValue('50') // 월세 50만원
        await inputsAfter[1].setValue('5')
        expect(wrapper.text()).toContain('120,000,000원') // 원래 보증금 차액으로 정확히 복원
    })

    it('"보증금 차액 + 월세 → 전환율 계산" 모드에서 1.2억/50만원을 입력하면 전환율 5.00%가 역산됨', async () => {
        const wrapper = mount(JeonseCalculatorTool)
        await wrapper.find('select').setValue('rate-from-both')
        const inputs = wrapper.findAll('input')
        await inputs[0].setValue('12000') // 보증금 차액 12,000만원
        await inputs[1].setValue('50') // 월세 50만원
        expect(wrapper.text()).toContain('5.00%')
    })

    it('적용 전환율이 법정 상한(기준금리+2.0%p)을 넘으면 경고가 뜨고, 상한 이내면 안 뜸', async () => {
        const wrapper = mount(JeonseCalculatorTool)
        const inputs = wrapper.findAll('input')
        await inputs[1].setValue('10') // 전환율 10% — 기본 기준금리 2.75% + 2.0%p = 상한 4.75%를 초과
        expect(wrapper.text()).toContain('를 초과합니다')

        await inputs[1].setValue('3') // 3%는 상한 4.75% 이내
        expect(wrapper.text()).not.toContain('를 초과합니다')
    })

    it('면책 문구와 기준연도가 항상 보임', () => {
        const wrapper = mount(JeonseCalculatorTool)
        expect(wrapper.text()).toContain('참고용 계산이며 법적 효력이 없습니다')
        expect(wrapper.text()).toContain('2026년 기준')
    })
})
