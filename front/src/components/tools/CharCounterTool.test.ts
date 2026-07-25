import {describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import CharCounterTool from './CharCounterTool.vue'

describe('CharCounterTool', () => {
    it('로드 직후에는 통계가 모두 0', () => {
        const wrapper = mount(CharCounterTool)
        const labels = ['공백 포함', '공백 제외', '바이트', '단어', '줄']
        for (const label of labels) {
            expect(wrapper.text()).toContain(label)
        }
        // 각 통계 카드의 값(font-mono 숫자)이 실제로 0인지 확인 — 라벨 존재만으로는
        // "로드 직후 0"이라는 주장을 검증하지 못한다.
        const values = wrapper.findAll('.text-xl').map(el => el.text())
        expect(values).toHaveLength(labels.length)
        expect(values.every(v => v === '0')).toBe(true)
    })

    it('텍스트를 입력하면 공백 포함/제외 글자 수가 정확히 표시된다', async () => {
        const wrapper = mount(CharCounterTool)
        const textarea = wrapper.find('textarea')
        await textarea.setValue('a b c')
        // "a b c" → 공백 포함 5, 공백 제외 3, 단어 3
        expect(wrapper.text()).toContain('5')
        expect(wrapper.text()).toContain('3')
    })
})
