import {describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import MbtiCompatibilityTool from './MbtiCompatibilityTool.vue'
import {getCompatibility} from '../../data/mbtiCompatibility'
import {getTopCompatibilities, getWorstCompatibilities} from '../../utils/mbtiCompatibility'

describe('MbtiCompatibilityTool', () => {
    it('기본 선택(INTJ × ENFP)의 연애/우정/직장 점수·설명이 실제 계산 결과와 정확히 일치한다', () => {
        const wrapper = mount(MbtiCompatibilityTool)
        const text = wrapper.text()

        const romance = getCompatibility('INTJ', 'ENFP', 'romance')
        const friendship = getCompatibility('INTJ', 'ENFP', 'friendship')
        const work = getCompatibility('INTJ', 'ENFP', 'work')

        expect(text).toContain(`${romance.score}%`)
        expect(text).toContain(romance.description)
        expect(text).toContain(`${friendship.score}%`)
        expect(text).toContain(friendship.description)
        expect(text).toContain(`${work.score}%`)
        expect(text).toContain(work.description)
    })

    it('MBTI 선택을 바꾸면 실제 새 조합의 점수로 갱신된다 (이전 조합 점수와는 다름)', async () => {
        const wrapper = mount(MbtiCompatibilityTool)
        const beforeRomanceScore = getCompatibility('INTJ', 'ENFP', 'romance').score

        const selects = wrapper.findAll('select')
        await selects[0].setValue('ISTJ')
        await selects[1].setValue('INTJ')

        const afterRomance = getCompatibility('ISTJ', 'INTJ', 'romance')
        expect(wrapper.text()).toContain(`${afterRomance.score}%`)
        expect(wrapper.text()).toContain(afterRomance.description)
        // 실제로 다른 조합이므로(적어도 이 두 조합에서는) 점수가 달라야 얕은 테스트가 아님을 보증
        expect(afterRomance.score).not.toBe(beforeRomanceScore)
    })

    it('궁합 랭킹 탭에서 연애 최고/최악 Top 5가 실제 정렬된 데이터와 일치해 보인다', async () => {
        const wrapper = mount(MbtiCompatibilityTool)
        const tabs = wrapper.findAll('button').filter(b => b.text().includes('궁합 랭킹'))
        expect(tabs.length).toBeGreaterThan(0)
        await tabs[0].trigger('click')

        const top5 = getTopCompatibilities('romance', 5)
        const worst5 = getWorstCompatibilities('romance', 5)
        const text = wrapper.text()

        for (const item of top5) {
            expect(text).toContain(`${item.a} × ${item.b}`)
        }
        for (const item of worst5) {
            expect(text).toContain(`${item.a} × ${item.b}`)
        }
        // 최고 궁합 1위 점수가 최악 궁합 1위 점수보다 확실히 높아야 한다 (랭킹 방향이 뒤집히지 않았는지)
        expect(top5[0].score).toBeGreaterThan(worst5[0].score)
    })

    it('랭킹 탭에서 분류를 직장으로 바꾸면 직장 기준 랭킹으로 바뀐다', async () => {
        const wrapper = mount(MbtiCompatibilityTool)
        const rankTab = wrapper.findAll('button').filter(b => b.text().includes('궁합 랭킹'))[0]
        await rankTab.trigger('click')

        const workTab = wrapper.findAll('button').filter(b => b.text().trim() === '직장')
        expect(workTab.length).toBeGreaterThan(0)
        await workTab[0].trigger('click')

        const workTop5 = getTopCompatibilities('work', 5)
        const text = wrapper.text()
        for (const item of workTop5) {
            expect(text).toContain(`${item.a} × ${item.b}`)
        }
    })
})
