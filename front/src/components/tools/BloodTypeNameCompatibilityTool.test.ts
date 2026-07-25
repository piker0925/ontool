import {describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import BloodTypeNameCompatibilityTool from './BloodTypeNameCompatibilityTool.vue'

describe('BloodTypeNameCompatibilityTool', () => {
    it('기본값(내 O형 · 상대 A형)으로 속설표 최고점 90점과 코멘트가 보임', () => {
        const wrapper = mount(BloodTypeNameCompatibilityTool)
        expect(wrapper.text()).toContain('90점')
        expect(wrapper.text()).toContain('속설 최고 궁합 — 서로를 잘 챙겨줌')
    })

    it('혈액형을 바꾸면 점수와 코멘트가 함께 바뀜', async () => {
        const wrapper = mount(BloodTypeNameCompatibilityTool)
        const selects = wrapper.findAll('select')
        await selects[0].setValue('B')
        await selects[1].setValue('AB')
        expect(wrapper.text()).toContain('82점')
        expect(wrapper.text()).toContain('의외로 케미가 좋은 조합')
    })

    it('이름을 둘 다 입력해야 이름 궁합 카드가 나타나고, 결정론적으로 항상 같은 점수(홍길동+김철수 → 82점)를 보여줌', async () => {
        const wrapper = mount(BloodTypeNameCompatibilityTool)
        expect(wrapper.text()).not.toContain('이름 궁합')
        const textInputs = wrapper.findAll('input[type="text"]')
        await textInputs[0].setValue('홍길동')
        await textInputs[1].setValue('김철수')
        expect(wrapper.text()).toContain('이름 궁합')
        expect(wrapper.text()).toContain('82점')
    })

    it('과학적 근거 없는 재미용 콘텐츠라는 문구가 항상 보임', () => {
        const wrapper = mount(BloodTypeNameCompatibilityTool)
        expect(wrapper.text()).toContain('과학적 근거 없는 재미용')
    })
})
