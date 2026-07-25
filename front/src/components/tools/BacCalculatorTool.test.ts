import {describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import BacCalculatorTool from './BacCalculatorTool.vue'

describe('BacCalculatorTool', () => {
    it('기본값(남성 70kg, 소주 350mL 17%, 1시간 경과)으로 BAC 0.085%가 보임', () => {
        const wrapper = mount(BacCalculatorTool)
        expect(wrapper.text()).toContain('0.085%')
    })

    it('성별을 여성으로 바꾸면 같은 조건에서 BAC가 더 높게(다르게) 나옴', async () => {
        const wrapper = mount(BacCalculatorTool)
        await wrapper.find('select').setValue('female')
        expect(wrapper.text()).not.toContain('0.085%')
    })

    it('음주운전 경고 문구가 항상 보임', () => {
        const wrapper = mount(BacCalculatorTool)
        expect(wrapper.text()).toContain('음주운전')
    })
})
