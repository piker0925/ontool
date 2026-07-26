import {describe, expect, it} from 'vitest'
import {MBTI_MATCH_CARDS} from './mbtiMatchCards'
import {MBTI_TYPES} from './mbtiTypes'

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/

describe('MBTI_MATCH_CARDS', () => {
    it('16유형 전부를 정확히 1개씩 커버한다 (누락·중복 없음)', () => {
        expect(MBTI_MATCH_CARDS.length).toBe(16)
        expect(new Set(MBTI_MATCH_CARDS.map(c => c.type)).size).toBe(16)
        expect([...MBTI_MATCH_CARDS.map(c => c.type)].sort()).toEqual([...MBTI_TYPES].sort())
    })

    it('모든 카드가 동물·음식·색깔·직업·문구 필드를 비어있지 않게 채우고 있다', () => {
        for (const card of MBTI_MATCH_CARDS) {
            expect(card.nickname.trim().length, `${card.type} nickname`).toBeGreaterThan(0)
            expect(card.animal.trim().length, `${card.type} animal`).toBeGreaterThan(0)
            expect(card.animalReason.trim().length, `${card.type} animalReason`).toBeGreaterThan(0)
            expect(card.food.trim().length, `${card.type} food`).toBeGreaterThan(0)
            expect(card.color.trim().length, `${card.type} color`).toBeGreaterThan(0)
            expect(card.job.trim().length, `${card.type} job`).toBeGreaterThan(0)
            expect(card.quote.trim().length, `${card.type} quote`).toBeGreaterThan(0)
        }
    })

    it('색깔 hex 코드는 전부 유효한 #RRGGBB 형식이다', () => {
        for (const card of MBTI_MATCH_CARDS) {
            expect(card.colorHex, card.type).toMatch(HEX_PATTERN)
        }
    })

    it('동물 매칭은 유형마다 서로 다르다 (기계적 복붙 방지)', () => {
        const animals = MBTI_MATCH_CARDS.map(c => c.animal)
        expect(new Set(animals).size).toBe(MBTI_MATCH_CARDS.length)
    })
})
