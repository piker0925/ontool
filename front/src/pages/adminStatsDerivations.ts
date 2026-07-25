// AdminPage 통계 탭(161)이 이미 불러온 ToolStats 목록만으로 재가공하는 순수 함수들.
// AdminPage.vue의 computed에서 그대로 쓰기 위해 Vue와 무관한 별도 파일로 분리 —
// <script setup> 안의 지역 const는 외부에서 import할 수 없어 단위 테스트가 불가능하다.
import {ZONES, type ZoneId} from '../config/zones'

export interface AdminStatItem {
    moduleId: string
    useCount: number
    likeCount: number
    failCount: number
}

export interface ChartDatum {
    label: string
    value: number
}

// 118의 "모듈별 사용량" 막대 — 값 기준 정렬(단일 계열이라 정렬해도 색-순위 문제 없음),
// 화면 밀도를 위해 상위 10개만. 라벨은 레지스트리의 한글 name, 없으면 raw id로 폴백(161).
export function moduleUsageChartData(stats: AdminStatItem[], nameFor: (moduleId: string) => string | undefined): ChartDatum[] {
    return [...stats]
        .sort((a, b) => b.useCount - a.useCount)
        .slice(0, 10)
        .map(s => ({label: nameFor(s.moduleId) ?? s.moduleId, value: s.useCount}))
}

export interface ModuleStatsRow {
    moduleId: string
    name: string
    useCount: number
    likeCount: number
    failCount: number
    /** true면 이 모듈은 구조상 0이 아닌 failCount를 가질 수 있다(moduleCanFail). */
    canFail: boolean
    /**
     * failCount/useCount 비율. null이면 표시할 퍼센트가 없다는 뜻이고, 이유는 둘 중 하나 —
     * canFail이 false(순수 프론트 계산 도구라 애초에 실패 개념이 없음) 또는 canFail은 true인데
     * useCount가 0(아직 한 번도 안 쓰여 "사용 없음"). 어느 쪽인지는 canFail 필드로 구분한다.
     */
    failRate: number | null
}

// "모듈 통계" 표(161 이후 라운드) — 기존에 따로 있던 "모듈별 실패율 랭킹" 미니 표를 여기로
// 합쳤다. /admin/stats(stats)에는 한 번이라도 조회·사용된 모듈만 행이 있어, canFail이 true인데
// 아직 tool_stats 행이 아예 없는 모듈(한 번도 Job이 안 생긴 Heavy 도구 등)은 통째로 빠진다 —
// "이 목록이 전부인가, 누락된 건가"를 관리자가 매번 의심하지 않도록 failableModuleIds로 그 빈
// 자리를 useCount=0 행으로 보완한다(생략이 아니라 "사용 없음"으로 명시).
export function mergedModuleStatsRows(
    stats: AdminStatItem[],
    nameFor: (moduleId: string) => string | undefined,
    canFail: (moduleId: string) => boolean,
    failableModuleIds: string[],
): ModuleStatsRow[] {
    const byId = new Map(stats.map(s => [s.moduleId, s]))
    const missingFailableIds = failableModuleIds.filter(id => !byId.has(id))
    const allIds = [...stats.map(s => s.moduleId), ...missingFailableIds]

    return allIds.map(moduleId => {
        const s = byId.get(moduleId)
        const useCount = s?.useCount ?? 0
        const likeCount = s?.likeCount ?? 0
        const failCount = s?.failCount ?? 0
        const eligible = canFail(moduleId)
        return {
            moduleId,
            name: nameFor(moduleId) ?? moduleId,
            useCount,
            likeCount,
            failCount,
            canFail: eligible,
            failRate: eligible && useCount > 0 ? failCount / useCount : null,
        }
    })
}

export type ModuleStatsSortKey = 'name' | 'useCount' | 'likeCount' | 'failCount' | 'failRate'

// 실패율 컬럼 정렬은 방향(asc/desc)과 무관하게 값이 없는 행(canFail=false 또는 사용 없음)을
// 항상 맨 아래로 보낸다 — "정렬 방향을 바꾸면 빈 셀이 맨 위로 온다"는 혼란을 막기 위함.
export function sortModuleStatsRows(rows: ModuleStatsRow[], sortKey: ModuleStatsSortKey, sortDir: 'asc' | 'desc'): ModuleStatsRow[] {
    const dir = sortDir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
        if (sortKey === 'failRate') {
            const aHas = a.failRate !== null
            const bHas = b.failRate !== null
            if (aHas !== bHas) return aHas ? -1 : 1
            if (!aHas) return a.moduleId.localeCompare(b.moduleId)
            return (a.failRate! - b.failRate!) * dir
        }
        if (sortKey === 'name') return a.name.localeCompare(b.name) * dir
        return (a[sortKey] - b[sortKey]) * dir
    })
}

// "구역별 사용량 분포" 도넛(161) — ToolStats를 모듈 레지스트리의 zones[0](ADR-0030: 도구당 구역
// 1개)과 조인해 구역별 useCount 합산. 레지스트리에 없는 moduleId(폐기된 모듈 등)는 어느 구역에도
// 속하지 않으므로 집계에서 제외한다(기타 버킷을 만들지 않음). 레인·가입경로 도넛과 같은 이유로
// 항상 ZONES 고정 순서로 반환한다 — 값 크기로 정렬하면 카테고리 색이 순위를 따라 뒤바뀐다.
export function zoneUsageDonutData(stats: AdminStatItem[], zoneFor: (moduleId: string) => ZoneId | undefined): ChartDatum[] {
    const byZone = new Map<ZoneId, number>()
    for (const s of stats) {
        const zone = zoneFor(s.moduleId)
        if (!zone) continue
        byZone.set(zone, (byZone.get(zone) ?? 0) + s.useCount)
    }
    return ZONES.map(z => ({label: z.name, value: byZone.get(z.id) ?? 0}))
}
