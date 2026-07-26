import {getCompatibility, MBTI_COMPATIBILITY} from '../data/mbtiCompatibility'
import {MBTI_TYPES, type MbtiCompatibilityCategory} from '../data/mbtiTypes'

export type {MbtiCompatibilityCategory}
export {getCompatibility, MBTI_COMPATIBILITY, MBTI_TYPES}

export interface MbtiCompatibilityRankItem {
    a: string
    b: string
    score: number
    description: string
}

/**
 * 순서 무관 유일 조합(자기 자신 포함, 16 + C(16,2) = 136개) 목록을 만든다.
 * 랭킹 탭에서 A-B와 B-A를 동시에 보여주지 않기 위한 용도 — 궁합 점수는 대칭이라
 * 어느 쪽을 대표로 뽑아도 랭킹 결과는 같다.
 */
export function listUniqueMbtiPairs(category: MbtiCompatibilityCategory): MbtiCompatibilityRankItem[] {
    const items: MbtiCompatibilityRankItem[] = []
    for (let i = 0; i < MBTI_TYPES.length; i++) {
        for (let j = i; j < MBTI_TYPES.length; j++) {
            const a = MBTI_TYPES[i]
            const b = MBTI_TYPES[j]
            const entry = getCompatibility(a, b, category)
            items.push({a, b, score: entry.score, description: entry.description})
        }
    }
    return items
}

function sortStable(items: MbtiCompatibilityRankItem[], desc: boolean): MbtiCompatibilityRankItem[] {
    return [...items].sort((x, y) => desc ? y.score - x.score : x.score - y.score)
}

/** 궁합 점수가 가장 높은 Top N (기본 5) 조합을 반환한다. */
export function getTopCompatibilities(category: MbtiCompatibilityCategory, n = 5): MbtiCompatibilityRankItem[] {
    return sortStable(listUniqueMbtiPairs(category), true).slice(0, n)
}

/** 궁합 점수가 가장 낮은 Worst N (기본 5) 조합을 반환한다. */
export function getWorstCompatibilities(category: MbtiCompatibilityCategory, n = 5): MbtiCompatibilityRankItem[] {
    return sortStable(listUniqueMbtiPairs(category), false).slice(0, n)
}
