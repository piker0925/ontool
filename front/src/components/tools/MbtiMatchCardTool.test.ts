import {describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import MbtiMatchCardTool from './MbtiMatchCardTool.vue'
import {MBTI_MATCH_CARDS} from '../../data/mbtiMatchCards'
import {MBTI_TYPES} from '../../data/mbtiTypes'

describe('MbtiMatchCardTool', () => {
    it('16유형 전부의 카드가 렌더링된다 (유형 문자열이 하나도 빠짐없이 보임)', () => {
        const wrapper = mount(MbtiMatchCardTool)
        const text = wrapper.text()
        for (const type of MBTI_TYPES) {
            expect(text, type).toContain(type)
        }
    })

    it('각 카드의 동물·음식·색깔·직업·문구가 실제 데이터 값 그대로 렌더링된다', () => {
        const wrapper = mount(MbtiMatchCardTool)
        const text = wrapper.text()
        for (const card of MBTI_MATCH_CARDS) {
            expect(text, `${card.type} animal`).toContain(card.animal)
            expect(text, `${card.type} food`).toContain(card.food)
            expect(text, `${card.type} color`).toContain(card.color)
            expect(text, `${card.type} job`).toContain(card.job)
            expect(text, `${card.type} quote`).toContain(card.quote)
        }
    })

    it('정확히 16장의 카드 DOM이 렌더링된다 (중복·누락 없음)', () => {
        const wrapper = mount(MbtiMatchCardTool)
        // 카드 하나당 정확히 1개씩 존재하는 mono 폰트 유형 배지로 카운트
        const badges = wrapper.findAll('dl')
        expect(badges.length).toBe(16)
    })
})
