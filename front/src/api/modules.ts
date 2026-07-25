import type {Module} from '../types'
import type {ZoneId} from '../config/zones'
import {MOCK_MODULES} from './mock'
import {FULL_SHELL_COMPONENTS} from '../config/shellComponents'

const CATEGORY_MAP: Record<string, string> = {
    pdf: 'PDF',
    image: '이미지',
    generator: '생성기',
    codegen: '생성기',
    security: '보안·암호화',
    formatter: '포맷터',
    converter: '포맷터',
    text: '텍스트',
    network: '네트워크',
    devops: 'DevOps',
    util: '보안·암호화',
    video: '영상',
}

const META_BY_ID = new Map(MOCK_MODULES.map(m => [m.id, m]))

// 백엔드 목록에서 숨기는 모듈: 통합 도구(인코더/데이터 변환/텍스트 유틸/다중 해시/코드 생성기/PDF 편집기/문서 생성기)로
// 흡수된 모듈. 백엔드에 남아 있으며 통합 페이지가 내부적으로 호출한다
// (qr-code, barcode, pdf-watermark, pdf-password, pdf-header-footer, invoice-generator,
// office-document-convert 포함 — 094, 커스텀 프론트 컴포넌트가 useHeavyJob으로 직접 배선).
// 프론트 전용으로 이전한 모듈(subnet-calc·url-parser·cron·hmac·aes·text-diff·regex-tester·totp)과
// 백엔드에서 완전히 제거된 모듈(resume-pdf — ADR 반영, markdown-to-pdf와 차별성 부족으로 폐기)은
// 여기서 숨길 필요가 없다(API가 반환하지 않음).
const HIDDEN_MODULE_IDS = new Set([
    'sha256', 'json-yaml', 'json-toml', 'json-xml', 'csv-json',
    'qr-code', 'barcode',
    'pdf-watermark', 'pdf-password', 'pdf-header-footer', 'invoice-generator',
    'office-document-convert',
])

// isFrontendOnly=true지만 내부적으로 useHeavyJob 등을 통해 백엔드를 직접 호출해 이미 useCount가
// 오르는 도구. 진입 시 사용 감지 ping(markFrontendToolUsed)을 또 보내면 중복 카운트된다.
const BACKEND_WIRED_FRONTEND_TOOL_IDS = new Set([
    'pdf-watermark', 'pdf-password', 'pdf-header-footer', 'office-document-convert',
    'data-convert', 'code-gen', 'document-generator',
])

// 순수 클라이언트 계산 도구(로또 번호 생성기 등)는 백엔드 실행 API를 아예 타지 않아
// useCount가 영원히 0으로 고정된다 — 이런 도구만 진입 시 사용 감지 ping을 보내야 한다.
export function needsUsagePing(mod: Module): boolean {
    return !!mod.isFrontendOnly && !BACKEND_WIRED_FRONTEND_TOOL_IDS.has(mod.id)
}

// moduleId → 한글 name 조회(관리자 통계 탭 161 등, MOCK_MODULES 레지스트리 기준). 레지스트리에
// 없는 id(폐기된 모듈 등)면 undefined — 호출부가 raw id로 폴백한다.
export function moduleNameFor(moduleId: string): string | undefined {
    return META_BY_ID.get(moduleId)?.name
}

// moduleId → 소속 구역(ADR-0030: 도구당 구역 1개). 레지스트리에 없거나 zones가 비어있으면 undefined.
export function moduleZoneFor(moduleId: string): ZoneId | undefined {
    return META_BY_ID.get(moduleId)?.zones[0]
}

// 이 모듈이 실제로 0이 아닌 failCount를 가질 수 있는지(관리자 통계 탭 161 "모듈별 실패율 랭킹" 전용).
// 백엔드 failCount는 저장 카운터가 아니라 job 테이블에서 status=FAILED로 실시간 집계된다 —
// 즉 실제로 Job을 만들어 백엔드 큐를 타는 도구만 실패를 기록할 수 있다. Heavy 도구(isHeavy)는
// 당연히 여기 해당하고, isFrontendOnly=true라도 useHeavyJob 등으로 백엔드에 직접 배선된
// BACKEND_WIRED_FRONTEND_TOOL_IDS 도구들도 마찬가지다. 그 외 순수 프론트 계산 도구는 Job을
// 전혀 만들지 않으므로 failCount가 영원히 0으로 고정되고, 실패율 랭킹에 넣으면 "0%/N/A"만
// 80개 넘게 나열해 정보를 흐린다 — 그래서 랭킹 자체에서 제외한다(0%로 두고 정렬 최하위로
// 보내는 게 아니라 아예 후보에서 뺀다).
export function moduleCanFail(moduleId: string): boolean {
    return !!META_BY_ID.get(moduleId)?.isHeavy || BACKEND_WIRED_FRONTEND_TOOL_IDS.has(moduleId)
}

export function normalizeApiModules(data: Module[]): Module[] {
    const backendModules = data
        .filter(m => !HIDDEN_MODULE_IDS.has(m.id))
        .map(m => ({
            ...m,
            category: CATEGORY_MAP[m.category] ?? m.category,
            description: m.description ?? META_BY_ID.get(m.id)?.description,
            keywords: m.keywords ?? META_BY_ID.get(m.id)?.keywords,
            zones: m.zones ?? META_BY_ID.get(m.id)?.zones ?? [],
            kind: m.kind ?? META_BY_ID.get(m.id)?.kind,
            component: m.component ?? META_BY_ID.get(m.id)?.component ?? FULL_SHELL_COMPONENTS[m.id],
        }))
    const frontendOnly = MOCK_MODULES.filter(m => m.isFrontendOnly)
        .map(m => ({...m, component: m.component ?? FULL_SHELL_COMPONENTS[m.id]}))
    return [...backendModules, ...frontendOnly]
}

// API 호출 자체가 실패했을 때(백엔드 다운)의 최종 폴백 경로 전용 — MOCK_MODULES를 그대로 쓰면
// 셸 모듈(게임·뽀모도로 등)의 component가 비어 렌더링할 화면이 없다(mock.ts에 component를 두지
// 않음, config/shellComponents.ts 참고).
export function resolveMockModule(id: string): Module | null {
    const m = MOCK_MODULES.find(m => m.id === id)
    if (!m) return null
    return {...m, component: m.component ?? FULL_SHELL_COMPONENTS[id]}
}
