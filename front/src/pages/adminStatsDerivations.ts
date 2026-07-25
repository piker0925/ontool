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

export interface ModuleFailRateItem {
    moduleId: string
    name: string
    useCount: number
    failCount: number
    failRate: number
}

// "모듈별 실패율 랭킹"(161) — failCount/useCount 비율 내림차순. useCount=0인 모듈은 실패율이
// 정의되지 않으므로(0/0) 랭킹에서 제외한다. 동률이면 failCount 내림차순 → moduleId 오름차순으로
// 순서를 고정해 테스트·렌더링이 매 호출 안정적이게 한다.
//
// canFail: 백엔드 failCount는 저장 카운터가 아니라 job 테이블에서 실시간 집계되므로, 실제로
// Job을 만들어 백엔드 큐를 타는 도구(Heavy 도구 + 일부 backend-wired 프론트 전용 도구)만 0이
// 아닌 값을 가질 수 있다. 순수 프론트 계산 도구는 failCount가 영원히 0으로 고정돼 있어 랭킹에
// 넣으면 의미 없는 "0%" 수십 개가 나열된다 — canFail(moduleId)이 false인 도구는 아예 후보에서
// 제외한다(0%로 두고 정렬 최하위로 보내는 게 아니라 배제).
export function moduleFailRateRanking(
    stats: AdminStatItem[],
    nameFor: (moduleId: string) => string | undefined,
    canFail: (moduleId: string) => boolean,
): ModuleFailRateItem[] {
    return stats
        .filter(s => s.useCount > 0 && canFail(s.moduleId))
        .map(s => ({
            moduleId: s.moduleId,
            name: nameFor(s.moduleId) ?? s.moduleId,
            useCount: s.useCount,
            failCount: s.failCount,
            failRate: s.failCount / s.useCount,
        }))
        .sort((a, b) => b.failRate - a.failRate || b.failCount - a.failCount || a.moduleId.localeCompare(b.moduleId))
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
