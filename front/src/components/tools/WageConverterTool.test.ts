import {describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import WageConverterTool from './WageConverterTool.vue'

describe('WageConverterTool', () => {
    it('기준을 월급으로 바꾸면 입력한 월급(만원 단위, 콤마 포맷 텍스트 입력) 기준으로 시급·연봉이 역산됨(단방향 아님)', async () => {
        const wrapper = mount(WageConverterTool)
        await wrapper.find('select').setValue('monthly')
        await wrapper.findAll('input')[0].setValue('250') // 250만원 = 2,500,000원
        expect(wrapper.text()).toContain('11,962원') // 2,500,000 / 209시간 반올림
        expect(wrapper.text()).toContain('30,000,000원') // 2,500,000 × 12
    })

    it('기준을 월급으로 두면 최저임금 미만 경고는 뜨지 않음(경고는 시급 기준 입력에서만 유효)', async () => {
        const wrapper = mount(WageConverterTool)
        await wrapper.find('select').setValue('monthly')
        await wrapper.findAll('input')[0].setValue('50')
        expect(wrapper.text()).not.toContain('최저임금')
    })

    it('월 소정근로시간을 기본값(209) 대신 174시간(단시간 근로 계약)으로 바꾸면 시급 환산이 그에 맞게 달라짐', async () => {
        const wrapper = mount(WageConverterTool)
        await wrapper.find('select').setValue('monthly')
        const inputs = wrapper.findAll('input')
        await inputs[0].setValue('200') // 200만원 = 2,000,000원
        await inputs[1].setValue(174) // 월 소정근로시간(개수 필드라 콤마 포맷 미적용, type=number 그대로)
        expect(wrapper.text()).toContain('11,494원') // 2,000,000 / 174시간 반올림
    })

    it('시급 입력칸에 콤마가 포함된 숫자를 입력해도 정상 파싱됨(예: "10,320")', async () => {
        const wrapper = mount(WageConverterTool)
        await wrapper.findAll('input')[0].setValue('10,320')
        expect(wrapper.text()).toContain('2,156,880원') // 10,320 × 209시간
    })

    it('면책 문구와 기준연도가 항상 보임', () => {
        const wrapper = mount(WageConverterTool)
        expect(wrapper.text()).toContain('참고용 계산이며 법적 효력이 없습니다')
        expect(wrapper.text()).toContain('2026년 기준')
    })
})
