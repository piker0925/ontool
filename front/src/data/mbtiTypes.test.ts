import {describe, expect, it} from 'vitest'
import {MBTI_TYPE_INFO, MBTI_TYPES} from './mbtiTypes'

const AXIS_PATTERN = /^[EI][SN][TF][JP]$/

describe('MBTI_TYPES', () => {
    it('16개의 유효한 MBTI 유형 문자열을 중복 없이 담고 있다', () => {
        expect(MBTI_TYPES.length).toBe(16)
        expect(new Set(MBTI_TYPES).size).toBe(16)
        for (const type of MBTI_TYPES) {
            expect(type).toMatch(AXIS_PATTERN)
        }
    })
})

describe('MBTI_TYPE_INFO', () => {
    it('MBTI_TYPES의 16유형 각각에 대해 정확히 1개씩 정보를 갖는다', () => {
        expect(Object.keys(MBTI_TYPE_INFO).sort()).toEqual([...MBTI_TYPES].sort())
    })

    it('모든 유형이 별명과 3분류(연애/우정/직장) 특성 문구를 비어있지 않게 갖는다', () => {
        for (const type of MBTI_TYPES) {
            const info = MBTI_TYPE_INFO[type]
            expect(info.nickname.trim().length).toBeGreaterThan(0)
            expect(info.traits.romance.trim().length).toBeGreaterThan(0)
            expect(info.traits.friendship.trim().length).toBeGreaterThan(0)
            expect(info.traits.work.trim().length).toBeGreaterThan(0)
        }
    })

    it('별명은 유형마다 서로 다르다 (기계적 복붙 방지)', () => {
        const nicknames = MBTI_TYPES.map(t => MBTI_TYPE_INFO[t].nickname)
        expect(new Set(nicknames).size).toBe(MBTI_TYPES.length)
    })
})
