import type {ModuleConfig} from './types'

// 데이터 포맷 변환은 통합 페이지(UnifiedConvertPage)가 담당하지만,
// /run API 직접 사용 및 폴백을 위해 개별 설정을 유지한다.
export const CONVERTER_CONFIGS: Record<string, ModuleConfig> = {
    'json-yaml': {
        params: [
            {key: 'input', label: '입력', type: 'textarea', placeholder: '{"key": "value"}'},
            {key: 'direction', label: '변환 방향', type: 'select', options: ['json-to-yaml', 'yaml-to-json'], default: 'json-to-yaml'},
        ],
        sample: {input: '{"name": "DevToolbox", "tags": ["dev", "tools"], "active": true}'},
    },
    'json-toml': {
        params: [
            {key: 'input', label: '입력', type: 'textarea', placeholder: '{"key": "value"}'},
            {key: 'direction', label: '변환 방향', type: 'select', options: ['json-to-toml', 'toml-to-json'], default: 'json-to-toml'},
        ],
        sample: {input: '{"name": "DevToolbox", "tags": ["dev", "tools"], "active": true}'},
    },
    'json-xml': {
        params: [
            {key: 'input', label: '입력', type: 'textarea', placeholder: '{"key": "value"}'},
            {key: 'direction', label: '변환 방향', type: 'select', options: ['json-to-xml', 'xml-to-json'], default: 'json-to-xml'},
        ],
        sample: {input: '{"name": "DevToolbox", "tags": ["dev", "tools"], "active": true}'},
    },
    'csv-json': {
        params: [
            {key: 'input', label: '입력', type: 'textarea', placeholder: 'name,age\nAlice,30'},
            {key: 'direction', label: '변환 방향', type: 'select', options: ['csv-to-json', 'json-to-csv'], default: 'csv-to-json'},
        ],
        sample: {input: 'name,age\nAlice,30\nBob,25'},
    },
}
