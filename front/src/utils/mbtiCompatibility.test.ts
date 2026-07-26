import {describe, expect, it} from 'vitest'
import {getTopCompatibilities, getWorstCompatibilities, listUniqueMbtiPairs} from './mbtiCompatibility'

describe('listUniqueMbtiPairs', () => {
    it('16(자기 자신) + C(16,2)=120 = 136개의 유일한 순서-무관 조합을 반환한다', () => {
        const pairs = listUniqueMbtiPairs('romance')
        expect(pairs.length).toBe(136)
    })

    it('같은 순서-무관 조합이 두 번 나오지 않는다 (A-B와 B-A를 중복 반환하지 않음)', () => {
        const pairs = listUniqueMbtiPairs('friendship')
        const keys = pairs.map(p => [p.a, p.b].sort().join('-'))
        expect(new Set(keys).size).toBe(pairs.length)
    })
})

describe('getTopCompatibilities / getWorstCompatibilities — 실제 정렬 검증', () => {
    it('Top5는 점수 내림차순으로 정렬되어 있고, 전체 목록을 직접 정렬한 결과의 최고 5개와 정확히 일치한다', () => {
        for (const category of ['romance', 'friendship', 'work'] as const) {
            const top5 = getTopCompatibilities(category, 5)
            expect(top5.length).toBe(5)

            // 내림차순 정렬 검증 (실제 값 비교)
            for (let i = 0; i < top5.length - 1; i++) {
                expect(top5[i].score).toBeGreaterThanOrEqual(top5[i + 1].score)
            }

            // 독립적으로 재정렬한 결과와 점수 시퀀스가 정확히 일치해야 한다
            const expectedScores = [...listUniqueMbtiPairs(category)]
                .sort((x, y) => y.score - x.score)
                .slice(0, 5)
                .map(p => p.score)
            expect(top5.map(p => p.score)).toEqual(expectedScores)
        }
    })

    it('Worst5는 점수 오름차순으로 정렬되어 있고, 전체 목록을 직접 정렬한 결과의 최저 5개와 정확히 일치한다', () => {
        for (const category of ['romance', 'friendship', 'work'] as const) {
            const worst5 = getWorstCompatibilities(category, 5)
            expect(worst5.length).toBe(5)

            for (let i = 0; i < worst5.length - 1; i++) {
                expect(worst5[i].score).toBeLessThanOrEqual(worst5[i + 1].score)
            }

            const expectedScores = [...listUniqueMbtiPairs(category)]
                .sort((x, y) => x.score - y.score)
                .slice(0, 5)
                .map(p => p.score)
            expect(worst5.map(p => p.score)).toEqual(expectedScores)
        }
    })

    it('Top5의 점수는 Worst5의 점수보다 항상 높다 (두 랭킹이 서로 뒤바뀌지 않았는지 확인)', () => {
        for (const category of ['romance', 'friendship', 'work'] as const) {
            const top5 = getTopCompatibilities(category, 5)
            const worst5 = getWorstCompatibilities(category, 5)
            const minOfTop = Math.min(...top5.map(p => p.score))
            const maxOfWorst = Math.max(...worst5.map(p => p.score))
            expect(minOfTop, category).toBeGreaterThan(maxOfWorst)
        }
    })

    it('연애/우정/직장 분류를 바꾸면 Top5 구성이 달라질 수 있다 (분류별로 다른 데이터를 쓰는지 확인)', () => {
        const romanceTop = getTopCompatibilities('romance', 5).map(p => `${p.a}-${p.b}`).sort()
        const workTop = getTopCompatibilities('work', 5).map(p => `${p.a}-${p.b}`).sort()
        expect(romanceTop).not.toEqual(workTop)
    })
})
