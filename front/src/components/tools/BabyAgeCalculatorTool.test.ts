import {describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import BabyAgeCalculatorTool from './BabyAgeCalculatorTool.vue'

describe('BabyAgeCalculatorTool', () => {
    it('로드 직후에는 출생일이 비어 있어 "0개월 0일" 같은 의미 없는 결과가 보이지 않음', () => {
        const wrapper = mount(BabyAgeCalculatorTool)
        expect(wrapper.text()).not.toContain('0개월 0일')
        expect(wrapper.text()).toContain('출생일')
    })

    it('출생일을 입력하면 육아 개월수 결과가 나타남', async () => {
        const wrapper = mount(BabyAgeCalculatorTool)
        const birthInput = wrapper.findAll('input[type="date"]')[0]
        await birthInput.setValue('2025-01-01')
        expect(wrapper.text()).toMatch(/\d+개월 \d+일/)
    })
})
