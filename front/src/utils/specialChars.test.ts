import {describe, expect, it} from 'vitest'
import {SPECIAL_CHAR_CATEGORIES} from './specialChars'

// 서로게이트 페어 범위(0xD800-0xDBFF)를 포함하면 BMP 밖 코드포인트(대부분 컬러 이모지)로 판단한다.
const SURROGATE_HIGH = /[\uD800-\uDBFF]/

describe('SPECIAL_CHAR_CATEGORIES', () => {
    it('최소 12개 카테고리를 제공한다', () => {
        expect(SPECIAL_CHAR_CATEGORIES.length).toBeGreaterThanOrEqual(12)
    })

    it('카테고리마다 20개 이상의 항목을 제공한다', () => {
        for (const category of SPECIAL_CHAR_CATEGORIES) {
            expect(category.chars.length).toBeGreaterThanOrEqual(20)
        }
    })

    it('빈 카테고리가 없다', () => {
        for (const category of SPECIAL_CHAR_CATEGORIES) {
            expect(category.chars.length).toBeGreaterThan(0)
        }
    })

    it('카테고리마다 label과 chars를 가진다', () => {
        for (const category of SPECIAL_CHAR_CATEGORIES) {
            expect(typeof category.label).toBe('string')
            expect(category.label.length).toBeGreaterThan(0)
            expect(Array.isArray(category.chars)).toBe(true)
        }
    })

    it('같은 카테고리 안에 중복 문자가 없다', () => {
        for (const category of SPECIAL_CHAR_CATEGORIES) {
            const unique = new Set(category.chars)
            expect(unique.size).toBe(category.chars.length)
        }
    })

    it('카테고리 id가 서로 겹치지 않는다', () => {
        const ids = SPECIAL_CHAR_CATEGORIES.map(c => c.id)
        expect(new Set(ids).size).toBe(ids.length)
    })

    it('실제 컬러 이모지로만 구성된 카테고리가 최소 3개 신설되어 있다', () => {
        const emojiCategories = SPECIAL_CHAR_CATEGORIES.filter(category =>
            category.chars.every(ch => SURROGATE_HIGH.test(ch)),
        )
        expect(emojiCategories.length).toBeGreaterThanOrEqual(3)
    })

    it('표정·동물·음식 이모지 카테고리를 포함한다', () => {
        const ids = SPECIAL_CHAR_CATEGORIES.map(c => c.id)
        expect(ids).toEqual(expect.arrayContaining(['face', 'animal', 'food']))
    })
})
