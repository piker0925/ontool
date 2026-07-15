import type {Module} from '../types'
import {MOCK_MODULES} from './mock'

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
}

const META_BY_ID = new Map(MOCK_MODULES.map(m => [m.id, m]))

// 백엔드 목록에서 숨기는 모듈: 통합 도구(인코더/데이터 변환/텍스트 유틸/다중 해시/코드 생성기)로
// 흡수된 모듈. 백엔드에 남아 있으며 통합 페이지가 내부적으로 호출한다 (qr-code, barcode 포함).
// 프론트 전용으로 이전한 모듈(subnet-calc·url-parser·cron·hmac·aes·text-diff·regex-tester·totp)은
// 백엔드 모듈 자체를 제거했으므로 여기서 숨길 필요가 없다(API가 반환하지 않음).
const HIDDEN_MODULE_IDS = new Set([
    'sha256', 'json-yaml', 'json-toml', 'json-xml', 'csv-json',
    'qr-code', 'barcode',
])

export function normalizeApiModules(data: Module[]): Module[] {
    const backendModules = data
        .filter(m => !HIDDEN_MODULE_IDS.has(m.id))
        .map(m => ({
            ...m,
            category: CATEGORY_MAP[m.category] ?? m.category,
            description: m.description ?? META_BY_ID.get(m.id)?.description,
            keywords: m.keywords ?? META_BY_ID.get(m.id)?.keywords,
        }))
    const frontendOnly = MOCK_MODULES.filter(m => m.isFrontendOnly)
    return [...backendModules, ...frontendOnly]
}
