import {describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import LadderGameTool from './LadderGameTool.vue'

function findButtonByText(wrapper: ReturnType<typeof mount>, text: string) {
    return wrapper.findAll('button').find(b => b.text().trim() === text)
}

async function fillSample(wrapper: ReturnType<typeof mount>) {
    await findButtonByText(wrapper, '예시로 채워보기')!.trigger('click')
}

const SAMPLE_NAMES = ['철수', '영희', '민수', '지훈', '수아', '예린']

describe('LadderGameTool', () => {
    it('참가자가 2명 미만이면 "사다리 타기" 버튼이 비활성화되어 있다', () => {
        const wrapper = mount(LadderGameTool)
        const button = findButtonByText(wrapper, '사다리 타기')
        expect(button?.attributes('disabled')).toBeDefined()
    })

    it('사다리를 타면 참가자 수만큼 결과 행이 나오고, 시작 이름이 모두 정확히 한 번씩 나타난다', async () => {
        const wrapper = mount(LadderGameTool)
        await fillSample(wrapper)
        await findButtonByText(wrapper, '사다리 타기')!.trigger('click')

        const rows = wrapper.findAll('[data-testid="ladder-result-row"]')
        expect(rows).toHaveLength(SAMPLE_NAMES.length)

        const startNames = rows.map(r => r.find('span.font-medium').text())
        expect(startNames.sort()).toEqual([...SAMPLE_NAMES].sort())
    })

    it('당첨 인원 수를 1로 설정하면 O가 정확히 1개, X가 나머지 채워진다', async () => {
        const wrapper = mount(LadderGameTool)
        await fillSample(wrapper)
        await findButtonByText(wrapper, '1')!.trigger('click')
        await findButtonByText(wrapper, '사다리 타기')!.trigger('click')

        const outcomes = wrapper.findAll('[data-testid="ladder-result-outcome"]').map(el => el.text().trim())
        expect(outcomes.filter(o => o === 'O')).toHaveLength(1)
        expect(outcomes.filter(o => o === 'X')).toHaveLength(SAMPLE_NAMES.length - 1)
    })

    it('당첨 인원 수를 3으로 설정하면 O가 정확히 3개다 (1명일 때와 다른 결과 — 인원 수 반영 확인)', async () => {
        const wrapper = mount(LadderGameTool)
        await fillSample(wrapper)
        await findButtonByText(wrapper, '3')!.trigger('click')
        await findButtonByText(wrapper, '사다리 타기')!.trigger('click')

        const outcomes = wrapper.findAll('[data-testid="ladder-result-outcome"]').map(el => el.text().trim())
        expect(outcomes.filter(o => o === 'O')).toHaveLength(3)
        expect(outcomes.filter(o => o === 'X')).toHaveLength(SAMPLE_NAMES.length - 3)
    })

    it('직접 입력 모드에서 참가자 수만큼 항목을 입력하면 결과에 입력한 항목명이 그대로, 정확히 한 번씩 나타난다', async () => {
        const wrapper = mount(LadderGameTool)
        await fillSample(wrapper)
        await findButtonByText(wrapper, '직접 입력')!.trigger('click')

        const customOutcomes = ['1등', '2등', '3등', '4등', '5등', '꽝']
        await wrapper.find('textarea').setValue(customOutcomes.join('\n'))
        await findButtonByText(wrapper, '사다리 타기')!.trigger('click')

        const outcomes = wrapper.findAll('[data-testid="ladder-result-outcome"]').map(el => el.text().trim())
        expect(outcomes.sort()).toEqual([...customOutcomes].sort())
    })

    it('직접 입력 모드에서 항목 수가 참가자 수와 다르면 불일치 경고가 뜨고 O/X로 대체된다', async () => {
        const wrapper = mount(LadderGameTool)
        await fillSample(wrapper)
        await findButtonByText(wrapper, '직접 입력')!.trigger('click')

        await wrapper.find('textarea').setValue('1등, 2등')
        expect(wrapper.text()).toContain('달라 O/X로 표시됩니다')

        await findButtonByText(wrapper, '사다리 타기')!.trigger('click')
        const outcomes = wrapper.findAll('[data-testid="ladder-result-outcome"]').map(el => el.text().trim())
        expect(outcomes.every(o => o === 'O' || o === 'X')).toBe(true)
    })

    it('모드 전환 UI(팀 나누기·사다리타기 토글)는 더 이상 존재하지 않는다 (도구 분리 확인)', () => {
        const wrapper = mount(LadderGameTool)
        expect(findButtonByText(wrapper, '팀 나누기')).toBeUndefined()
        expect(wrapper.text()).not.toContain('팀 수')
    })
})
