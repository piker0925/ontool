import {describe, expect, it} from 'vitest'
import {moduleFailRateRanking, moduleUsageChartData, zoneUsageDonutData} from './adminStatsDerivations'
import type {AdminStatItem} from './adminStatsDerivations'

const NAME_BY_ID: Record<string, string> = {
    'pdf-merge': 'PDF 병합',
    'image-resize': '이미지 리사이즈',
}
const nameFor = (id: string) => NAME_BY_ID[id]

const ZONE_BY_ID: Record<string, 'dev' | 'files' | 'life' | 'fun'> = {
    'pdf-merge': 'files',
    'image-resize': 'files',
    'sha256': 'dev',
    'lotto-generator': 'fun',
}
const zoneFor = (id: string) => ZONE_BY_ID[id]

// 실제로 Job을 만들어 백엔드 큐를 타는(=failCount가 0이 아닐 수 있는) 도구만 true.
// Heavy 도구(pdf-merge)와 backend-wired 프론트 전용 도구(pdf-watermark)만 포함, 순수 프론트
// 계산 도구(lotto-generator)는 false — 백엔드 failCount가 job 테이블에서 실시간 집계되므로
// Job을 만들지 않는 도구는 구조상 failCount가 영원히 0이라 랭킹 후보에서 아예 빼야 한다.
const FAILABLE_IDS = new Set(['pdf-merge', 'image-resize', 'pdf-watermark'])
const canFor = (id: string) => FAILABLE_IDS.has(id)

describe('moduleUsageChartData', () => {
    it('레지스트리에 있는 모듈은 raw id 대신 한글 name을 라벨로 쓴다', () => {
        const stats: AdminStatItem[] = [
            {moduleId: 'pdf-merge', useCount: 10, likeCount: 0, failCount: 0},
        ]

        const result = moduleUsageChartData(stats, nameFor)

        expect(result).toEqual([{label: 'PDF 병합', value: 10}])
    })

    it('레지스트리에 없는 모듈은 raw moduleId로 폴백한다', () => {
        const stats: AdminStatItem[] = [
            {moduleId: 'deleted-module', useCount: 5, likeCount: 0, failCount: 0},
        ]

        const result = moduleUsageChartData(stats, nameFor)

        expect(result).toEqual([{label: 'deleted-module', value: 5}])
    })

    it('useCount 내림차순으로 정렬하고 상위 10개만 남긴다', () => {
        const stats: AdminStatItem[] = Array.from({length: 12}, (_, i) => ({
            moduleId: `mod-${i}`, useCount: i, likeCount: 0, failCount: 0,
        }))

        const result = moduleUsageChartData(stats, nameFor)

        expect(result).toHaveLength(10)
        expect(result[0]).toEqual({label: 'mod-11', value: 11})
        expect(result[9]).toEqual({label: 'mod-2', value: 2})
    })
})

describe('moduleFailRateRanking', () => {
    it('failCount/useCount 비율을 내림차순으로 랭킹한다 — 실패율이 낮은 모듈이 1위로 오지 않는다', () => {
        const stats: AdminStatItem[] = [
            {moduleId: 'low-fail', useCount: 100, likeCount: 0, failCount: 5},   // 5%
            {moduleId: 'high-fail', useCount: 20, likeCount: 0, failCount: 10},  // 50%
        ]
        const canForBoth = () => true

        const result = moduleFailRateRanking(stats, nameFor, canForBoth)

        expect(result[0].moduleId).toBe('high-fail')
        expect(result[0].failRate).toBeCloseTo(0.5)
        expect(result[1].moduleId).toBe('low-fail')
        expect(result[1].failRate).toBeCloseTo(0.05)
    })

    it('useCount가 0인 모듈은 0/0 실패율이 정의되지 않으므로 랭킹에서 제외한다', () => {
        const stats: AdminStatItem[] = [
            {moduleId: 'unused', useCount: 0, likeCount: 0, failCount: 0},
            {moduleId: 'used', useCount: 10, likeCount: 0, failCount: 1},
        ]
        const canForBoth = () => true

        const result = moduleFailRateRanking(stats, nameFor, canForBoth)

        expect(result).toHaveLength(1)
        expect(result[0].moduleId).toBe('used')
    })

    it('실패율이 같으면 failCount 내림차순으로 동률을 깬다', () => {
        const stats: AdminStatItem[] = [
            {moduleId: 'a', useCount: 10, likeCount: 0, failCount: 1},  // 10%
            {moduleId: 'b', useCount: 100, likeCount: 0, failCount: 10}, // 10%, failCount 더 큼
        ]
        const canForBoth = () => true

        const result = moduleFailRateRanking(stats, nameFor, canForBoth)

        expect(result.map(r => r.moduleId)).toEqual(['b', 'a'])
    })

    // 백엔드 failCount는 저장 카운터가 아니라 job 테이블에서 status=FAILED로 실시간 집계된다 —
    // Job을 아예 만들지 않는 순수 프론트 계산 도구는 useCount·failCount가 둘 다 있어 보여도
    // (프론트 자체 집계로 useCount는 오를 수 있다) canFail(moduleId)가 false면 후보에서 제외해야
    // 한다. 0%로 두고 정렬 최하위로 보내는 게 아니라 아예 배제되는지 검증.
    it('canFail(moduleId)가 false인 도구(순수 프론트 계산 도구)는 useCount·failCount가 있어도 랭킹에서 제외한다', () => {
        const stats: AdminStatItem[] = [
            {moduleId: 'pdf-merge', useCount: 10, likeCount: 0, failCount: 1},        // failable, 10%
            {moduleId: 'lotto-generator', useCount: 999, likeCount: 0, failCount: 999}, // 순수 프론트 — 이론상 100%지만 제외 대상
        ]

        const result = moduleFailRateRanking(stats, nameFor, canFor)

        expect(result).toHaveLength(1)
        expect(result[0].moduleId).toBe('pdf-merge')
        expect(result.some(r => r.moduleId === 'lotto-generator')).toBe(false)
    })

    it('canFail(moduleId)가 true인 backend-wired 프론트 전용 도구는 isHeavy가 아니어도 랭킹에 포함된다', () => {
        const stats: AdminStatItem[] = [
            {moduleId: 'pdf-watermark', useCount: 5, likeCount: 0, failCount: 1},
        ]

        const result = moduleFailRateRanking(stats, nameFor, canFor)

        expect(result).toHaveLength(1)
        expect(result[0].moduleId).toBe('pdf-watermark')
    })
})

describe('zoneUsageDonutData', () => {
    it('구역별 useCount를 합산하고 항상 고정된 4구역 순서(dev/files/life/fun)로 반환한다', () => {
        const stats: AdminStatItem[] = [
            {moduleId: 'pdf-merge', useCount: 10, likeCount: 0, failCount: 0},   // files
            {moduleId: 'image-resize', useCount: 5, likeCount: 0, failCount: 0}, // files
            {moduleId: 'sha256', useCount: 3, likeCount: 0, failCount: 0},       // dev
        ]

        const result = zoneUsageDonutData(stats, zoneFor)

        expect(result).toEqual([
            {label: '개발자 도구', value: 3},
            {label: '파일·문서', value: 15},
            {label: '생활 도구', value: 0},
            {label: '재미·게임', value: 0},
        ])
    })

    it('레지스트리에 없는 moduleId는 어느 구역에도 합산되지 않는다(기타 버킷을 만들지 않음)', () => {
        const stats: AdminStatItem[] = [
            {moduleId: 'deleted-module', useCount: 999, likeCount: 0, failCount: 0},
            {moduleId: 'sha256', useCount: 1, likeCount: 0, failCount: 0},
        ]

        const result = zoneUsageDonutData(stats, zoneFor)

        const total = result.reduce((sum, d) => sum + d.value, 0)
        expect(total).toBe(1)
        expect(result.find(d => d.label === '개발자 도구')?.value).toBe(1)
    })
})
