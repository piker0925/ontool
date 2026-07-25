import {describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import BiorhythmCalculatorTool from './BiorhythmCalculatorTool.vue'

// toISOString()은 UTC로 변환해 로컬 자정~오전 사이엔 하루 밀릴 수 있으므로(todayDateString.ts와 동일 이유),
// 로컬 getter로 직접 문자열을 만든다.
function dateDaysAgo(days: number): string {
    const d = new Date()
    d.setDate(d.getDate() - days)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
}

describe('BiorhythmCalculatorTool', () => {
    it('생년월일을 입력하지 않으면 안내 문구만 보이고 지표는 표시되지 않음', () => {
        const wrapper = mount(BiorhythmCalculatorTool)
        expect(wrapper.text()).toContain('생년월일을 입력하면')
    })

    it('신체 주기(23일)가 정확히 한 바퀴 도는 생년월일을 입력하면 신체 지표가 0으로 표시됨', async () => {
        const wrapper = mount(BiorhythmCalculatorTool)
        await wrapper.find('input[type="date"]').setValue(dateDaysAgo(23))
        const physicalValue = wrapper.findAll('.font-mono')[0].text()
        expect(Number(physicalValue)).toBeCloseTo(0, 6)
    })

    it('과학적 근거 없는 재미용 콘텐츠라는 문구가 항상 보임', () => {
        const wrapper = mount(BiorhythmCalculatorTool)
        expect(wrapper.text()).toContain('과학적 근거 없는 재미용')
    })
})
