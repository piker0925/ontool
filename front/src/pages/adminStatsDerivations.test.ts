import {describe, expect, it} from 'vitest'
import {mergedModuleStatsRows, moduleUsageChartData, sortModuleStatsRows, zoneUsageDonutData} from './adminStatsDerivations'
import type {AdminStatItem, ModuleStatsRow} from './adminStatsDerivations'

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

describe('mergedModuleStatsRows', () => {
    it('canFail=true이고 사용된 모듈은 실패율을 계산한다', () => {
        const stats: AdminStatItem[] = [
            {moduleId: 'pdf-merge', useCount: 20, likeCount: 3, failCount: 10}, // 50%
        ]

        const result = mergedModuleStatsRows(stats, nameFor, canFor, [])

        expect(result).toEqual([
            {moduleId: 'pdf-merge', name: 'PDF 병합', useCount: 20, likeCount: 3, failCount: 10, canFail: true, failRate: 0.5},
        ])
    })

    it('canFail=false인 모듈(순수 프론트 계산 도구)은 useCount가 있어도 failRate가 null이다 — 0%로 잘못 표시하지 않는다', () => {
        const stats: AdminStatItem[] = [
            {moduleId: 'lotto-generator', useCount: 999, likeCount: 0, failCount: 999},
        ]

        const result = mergedModuleStatsRows(stats, nameFor, canFor, [])

        expect(result[0].canFail).toBe(false)
        expect(result[0].failRate).toBeNull()
    })

    it('canFail=true인데 아직 tool_stats 행이 없는 모듈(failableModuleIds에만 있음)은 useCount=0 행으로 보완되고 failRate는 null(사용 없음)이다', () => {
        const stats: AdminStatItem[] = [
            {moduleId: 'pdf-merge', useCount: 20, likeCount: 3, failCount: 10},
        ]
        // pdf-watermark는 /admin/stats 응답엔 없지만(한 번도 안 쓰임) canFail=true인 failable 목록에 있다.
        const result = mergedModuleStatsRows(stats, nameFor, canFor, ['pdf-merge', 'pdf-watermark'])

        expect(result).toHaveLength(2)
        const watermarkRow = result.find(r => r.moduleId === 'pdf-watermark')
        expect(watermarkRow).toEqual({
            moduleId: 'pdf-watermark', name: 'pdf-watermark', useCount: 0, likeCount: 0, failCount: 0,
            canFail: true, failRate: null,
        })
    })

    it('이미 stats에 있는 failable 모듈은 failableModuleIds로 중복 추가되지 않는다', () => {
        const stats: AdminStatItem[] = [
            {moduleId: 'pdf-merge', useCount: 20, likeCount: 3, failCount: 10},
        ]

        const result = mergedModuleStatsRows(stats, nameFor, canFor, ['pdf-merge'])

        expect(result).toHaveLength(1)
    })
})

describe('sortModuleStatsRows', () => {
    const rows: ModuleStatsRow[] = [
        {moduleId: 'b-tool', name: 'B 도구', useCount: 100, likeCount: 1, failCount: 10, canFail: true, failRate: 0.1},
        {moduleId: 'a-tool', name: 'A 도구', useCount: 20, likeCount: 5, failCount: 10, canFail: true, failRate: 0.5},
        {moduleId: 'c-tool', name: 'C 도구', useCount: 50, likeCount: 2, failCount: 0, canFail: false, failRate: null},
        {moduleId: 'd-tool', name: 'D 도구', useCount: 0, likeCount: 0, failCount: 0, canFail: true, failRate: null},
    ]

    it('useCount 내림차순으로 정렬한다', () => {
        const result = sortModuleStatsRows(rows, 'useCount', 'desc')
        expect(result.map(r => r.moduleId)).toEqual(['b-tool', 'c-tool', 'a-tool', 'd-tool'])
    })

    it('name 오름차순으로 정렬한다', () => {
        const result = sortModuleStatsRows(rows, 'name', 'asc')
        expect(result.map(r => r.moduleId)).toEqual(['a-tool', 'b-tool', 'c-tool', 'd-tool'])
    })

    // failRate 정렬의 핵심 요구사항: 값이 없는 행(canFail=false 또는 사용 없음)은 정렬 방향과
    // 무관하게 항상 맨 아래로 가야 한다 — desc로 정렬했다고 null이 위로 오면 안 된다.
    it('failRate 내림차순 정렬 — null(해당 없음/사용 없음) 행은 맨 아래로 밀린다', () => {
        const result = sortModuleStatsRows(rows, 'failRate', 'desc')
        expect(result.map(r => r.moduleId)).toEqual(['a-tool', 'b-tool', 'c-tool', 'd-tool'])
    })

    it('failRate 오름차순으로 뒤집어도 null 행은 여전히 맨 아래다 — 방향과 무관하게 맨 아래 고정', () => {
        const result = sortModuleStatsRows(rows, 'failRate', 'asc')
        expect(result.map(r => r.moduleId)).toEqual(['b-tool', 'a-tool', 'c-tool', 'd-tool'])
        // null 두 행(c-tool, d-tool)은 여전히 마지막 두 자리에 있다.
        expect(result.slice(2).map(r => r.moduleId).sort()).toEqual(['c-tool', 'd-tool'])
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
