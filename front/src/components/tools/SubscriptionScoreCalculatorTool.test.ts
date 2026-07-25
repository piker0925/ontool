import {describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import SubscriptionScoreCalculatorTool from './SubscriptionScoreCalculatorTool.vue'

describe('SubscriptionScoreCalculatorTool', () => {
    it('기본값(무주택 5년 · 부양가족 3명 · 가입 60개월)으로 항목 점수 12/20/7, 합계 39점이 정확한 요소에 보임', () => {
        const wrapper = mount(SubscriptionScoreCalculatorTool)
        const scoreValues = wrapper.findAll('.divide-y .font-mono').map(el => el.text())
        expect(scoreValues).toEqual(['12점', '20점', '7점'])
        expect(wrapper.find('.text-zone-accent-life').text()).toBe('39점')
    })

    it('세 항목을 모두 만점 조건으로 입력하면 합계 84점(만점)이 보임', async () => {
        const wrapper = mount(SubscriptionScoreCalculatorTool)
        const inputs = wrapper.findAll('input')
        await inputs[0].setValue(15)
        await inputs[1].setValue(6)
        await inputs[2].setValue(180)
        expect(wrapper.text()).toContain('84점')
    })

    it('면책 문구와 기준연도가 항상 보임', () => {
        const wrapper = mount(SubscriptionScoreCalculatorTool)
        expect(wrapper.text()).toContain('참고용 계산이며 법적 효력이 없습니다')
        expect(wrapper.text()).toContain('2026년 기준')
    })
})
