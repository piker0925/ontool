import {describe, expect, it} from 'vitest'
import {generateLadderRungs, resolveOutcomeLabels, splitIntoTeams, traceLadderPaths} from './teamSplit'

describe('splitIntoTeams', () => {
    it('참가자 10명을 3팀으로 나누면 팀 인원 차이가 최대 1명 이내다', () => {
        const participants = Array.from({length: 10}, (_, i) => `참가자${i + 1}`)
        const teams = splitIntoTeams(participants, 3)
        expect(teams).toHaveLength(3)
        const sizes = teams.map(t => t.length)
        expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1)
    })

    it('모든 참가자가 정확히 한 팀에만 포함된다 (누락·중복 배정 없음)', () => {
        const participants = Array.from({length: 10}, (_, i) => `참가자${i + 1}`)
        const teams = splitIntoTeams(participants, 3)
        const flat = teams.flat()
        expect(flat).toHaveLength(participants.length)
        expect(new Set(flat)).toEqual(new Set(participants))
    })
})

describe('사다리타기 (generateLadderRungs + traceLadderPaths)', () => {
    it('결과 경로는 시작 위치와 도착 위치 간의 1:1 대응(순열)이다 (여러 번 생성해도 매번 검증)', () => {
        for (let trial = 0; trial < 50; trial++) {
            const participantCount = 6
            const rows = 12
            const rungs = generateLadderRungs(participantCount, rows)
            const result = traceLadderPaths(participantCount, rungs, rows)
            expect(result).toHaveLength(participantCount)
            expect(new Set(result)).toEqual(new Set(Array.from({length: participantCount}, (_, i) => i)))
        }
    })

    it('같은 행에서 인접한 두 개의 가로줄이 같은 세로줄을 공유하지 않는다', () => {
        const rungs = generateLadderRungs(6, 12)
        const byRow = new Map<number, number[]>()
        for (const r of rungs) {
            const list = byRow.get(r.row) ?? []
            list.push(r.leftIndex)
            byRow.set(r.row, list)
        }
        for (const cols of byRow.values()) {
            const sorted = [...cols].sort((a, b) => a - b)
            for (let i = 1; i < sorted.length; i++) {
                expect(sorted[i] - sorted[i - 1]).toBeGreaterThanOrEqual(2)
            }
        }
    })
})

describe('resolveOutcomeLabels', () => {
    it('당첨 항목 개수가 참가자 수와 정확히 일치하면 그대로(trim해서) 사용한다', () => {
        const labels = resolveOutcomeLabels(['커피 쏘기', '청소당번', '지각비 면제'], 3)
        expect(labels).toEqual(['커피 쏘기', '청소당번', '지각비 면제'])
    })

    it('빈 줄은 걸러내고 trim한다', () => {
        const labels = resolveOutcomeLabels(['  커피 쏘기  ', '', '청소당번'], 2)
        expect(labels).toEqual(['커피 쏘기', '청소당번'])
    })

    it('개수가 참가자 수와 다르면 번호(1번~N번)로 대체한다', () => {
        const labels = resolveOutcomeLabels(['커피 쏘기'], 3)
        expect(labels).toEqual(['1번', '2번', '3번'])
    })

    it('당첨 항목을 아예 입력하지 않으면 번호로 대체한다', () => {
        const labels = resolveOutcomeLabels([], 4)
        expect(labels).toEqual(['1번', '2번', '3번', '4번'])
    })
})
