export type ZoneId = 'dev' | 'files' | 'life' | 'fun'

export interface Zone {
    id: ZoneId
    name: string
    route: string
    /** Tailwind 테마 토큰 이름 — 원시 hex/oklch 직접 사용 금지 (DESIGN.md §2) */
    accent: string
    description: string
}

export const ZONES: Zone[] = [
    {id: 'dev', name: '개발자 도구', route: '/dev', accent: 'zone-dev', description: '포맷터·변환·보안·네트워크 등 개발 유틸리티'},
    {id: 'files', name: '파일·문서', route: '/files', accent: 'zone-files', description: '이미지·PDF 등 파일·문서 처리 도구'},
    {id: 'life', name: '생활 도구', route: '/life', accent: 'zone-life', description: '일상에서 쓰는 생활형 도구'},
    {id: 'fun', name: '게임', route: '/fun', accent: 'zone-fun', description: '부담 없이 즐기는 미니게임 모음'},
]

/** zoneId로 Zone을 찾는다. 못 찾으면(모듈에 zones가 비었거나 오타) 기본 구역(ZONES[0])으로 폴백 — 소비처마다 다른 폴백을 쓰지 않도록 단일화 */
export function zoneOf(zoneId: ZoneId | undefined): Zone {
    return ZONES.find(z => z.id === zoneId) ?? ZONES[0]
}
