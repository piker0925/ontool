import {describe, expect, it} from 'vitest'
import {SPECIAL_CHAR_CATEGORIES} from './specialChars'

describe('SPECIAL_CHAR_CATEGORIES', () => {
    it('최소 8개 카테고리를 제공한다', () => {
        expect(SPECIAL_CHAR_CATEGORIES.length).toBeGreaterThanOrEqual(8)
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
})
