import {describe, expect, it} from 'vitest'
import {getCompatibility, MBTI_COMPATIBILITY} from './mbtiCompatibility'
import {MBTI_TYPES, type MbtiCompatibilityCategory} from './mbtiTypes'

const CATEGORIES: MbtiCompatibilityCategory[] = ['romance', 'friendship', 'work']

describe('MBTI_COMPATIBILITY', () => {
    it('16×16 = 256가지 조합(자기 자신 포함)을 전부 담고 있다', () => {
        expect(Object.keys(MBTI_COMPATIBILITY).length).toBe(256)
        for (const a of MBTI_TYPES) {
            for (const b of MBTI_TYPES) {
                expect(MBTI_COMPATIBILITY[`${a}-${b}`], `${a}-${b}`).toBeDefined()
            }
        }
    })

    it('모든 조합·모든 분류에 대해 점수가 0~100 사이 정수이고 설명이 비어있지 않다', () => {
        for (const row of Object.values(MBTI_COMPATIBILITY)) {
            for (const category of CATEGORIES) {
                const entry = row[category]
                expect(Number.isInteger(entry.score)).toBe(true)
                expect(entry.score).toBeGreaterThanOrEqual(0)
                expect(entry.score).toBeLessThanOrEqual(100)
                expect(entry.description.trim().length).toBeGreaterThan(0)
            }
        }
    })

    it('궁합 점수는 순서에 무관하게 대칭이다 (A-B == B-A)', () => {
        for (const a of MBTI_TYPES) {
            for (const b of MBTI_TYPES) {
                for (const category of CATEGORIES) {
                    expect(getCompatibility(a, b, category).score, `${a}-${b}-${category}`)
                        .toBe(getCompatibility(b, a, category).score)
                }
            }
        }
    })

    it('자기 자신과의 궁합도 포함되어 있다', () => {
        for (const type of MBTI_TYPES) {
            for (const category of CATEGORIES) {
                const entry = getCompatibility(type, type, category)
                expect(entry.score).toBeGreaterThan(0)
                expect(entry.description.trim().length).toBeGreaterThan(0)
            }
        }
    })

    it('점수가 실제로 넓게 퍼져 있다 (최고/최악 랭킹이 의미 있으려면 다양성 필요)', () => {
        for (const category of CATEGORIES) {
            const scores = Object.values(MBTI_COMPATIBILITY).map(r => r[category].score)
            const min = Math.min(...scores)
            const max = Math.max(...scores)
            // 임의의 상수 점수 구현이면 통과할 수 없는 임계값 — 실제 축 기반 계산이 이뤄져야 한다.
            expect(max - min, category).toBeGreaterThan(40)
            expect(new Set(scores).size, `${category} distinct scores`).toBeGreaterThan(20)
        }
    })

    it('설명 텍스트는 조합마다 실질적으로 달라진다 (완전한 기계적 반복이 아님)', () => {
        for (const category of CATEGORIES) {
            const descriptions = Object.values(MBTI_COMPATIBILITY).map(r => r[category].description)
            // 256개 전부 유일할 필요는 없지만(템플릿+특성 조합), 절반 이상은 서로 달라야 한다.
            expect(new Set(descriptions).size, category).toBeGreaterThan(descriptions.length / 2)
        }
    })

    it('실제로 서로 다른 두 조합은 서로 다른 점수를 가질 수 있다 (하드코딩된 단일 값이 아님을 표본으로 확인)', () => {
        // ISTJ-ISTJ(완전 동일 유형)와 ISTJ-ENFP(모든 축이 반대) 는 서로 다른 계산 경로를 타야 한다.
        for (const category of CATEGORIES) {
            const same = getCompatibility('ISTJ', 'ISTJ', category).score
            const opposite = getCompatibility('ISTJ', 'ENFP', category).score
            expect(same, category).not.toBe(opposite)
        }
    })
})
