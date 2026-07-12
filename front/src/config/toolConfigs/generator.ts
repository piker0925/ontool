import type {ModuleConfig} from './types'

/**
 * qr-code/barcode 는 통합 코드 생성기(UnifiedCodeGenPage, /tools/code-gen)로 이관됨.
 * Light 생성기 개별 설정은 더 이상 없다.
 */
export const GENERATOR_CONFIGS: Record<string, ModuleConfig> = {}

export const GENERATOR_HEAVY_CONFIGS: Record<string, ModuleConfig> = {
    'json-schema-to-dto': {
        params: [
            {
                key: 'inputType', label: '입력 형식', type: 'select',
                options: ['schema', 'json'], default: 'schema',
                help: 'schema: JSON Schema 문서 / json: 예시 JSON 데이터를 붙여넣으면 구조를 자동 추론해 DTO 생성',
            },
            {
                key: 'dtoStyle', label: 'DTO 스타일', type: 'select',
                options: ['jackson', 'lombok'], default: 'jackson',
                help: 'jackson: getter/setter/equals/toString 포함 / lombok: @Data 어노테이션으로 보일러플레이트 제거',
            },
            {
                key: 'packageName', label: '패키지명', type: 'text',
                placeholder: 'com.example', default: 'com.generated',
                help: '자바 패키지 형식 (예: com.example.dto)',
            },
        ],
        textInput: {
            label: 'JSON Schema 또는 예시 JSON 직접 입력 (문법 오류 시 행/열 위치를 알려줍니다)',
            placeholder: '{\n  "type": "object",\n  "properties": {\n    "id": { "type": "integer" },\n    "name": { "type": "string" }\n  }\n}\n\n또는 입력 형식을 json으로 바꾸고 예시 데이터 붙여넣기:\n{ "id": 1, "name": "a" }',
            filename: 'schema.json',
        },
    },
    'openapi-to-code': {
        params: [
            {
                key: 'language', label: '출력 언어', type: 'select',
                options: ['java', 'kotlin', 'typescript'], default: 'java',
                help: '모델 + API 클라이언트 코드가 ZIP으로 생성됩니다',
            },
        ],
        textInput: {
            label: 'OpenAPI 스펙 직접 입력 (YAML 또는 JSON, openapi: 3.x 필드 필수)',
            placeholder: 'openapi: "3.0.0"\ninfo:\n  title: My API\n  version: "1.0"\npaths:\n  /users:\n    get:\n      responses:\n        "200":\n          description: OK',
            filename: 'spec.yaml',
        },
    },
}
