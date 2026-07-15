import type {ModuleConfig} from './types'

export const FORMATTER_CONFIGS: Record<string, ModuleConfig> = {
    'sql-formatter': {
        params: [
            {key: 'sql', label: 'SQL', type: 'textarea', placeholder: 'SELECT * FROM users WHERE id = 1;'},
            {
                key: 'uppercase', label: '키워드 대문자화', type: 'checkbox', default: 'true',
                help: '해제하면 SQL 키워드를 소문자로 출력합니다',
            },
            {
                key: 'indent', label: '들여쓰기 폭', type: 'select', options: ['2', '4'], default: '2',
                help: 'JOIN·AND 등 보조 절의 들여쓰기 칸 수',
            },
        ],
        sample: {sql: 'SELECT u.id, u.name, o.total FROM users u JOIN orders o ON o.user_id = u.id WHERE o.total > 1000 ORDER BY o.total DESC;'},
    },
    'xml-formatter': {
        params: [
            {key: 'xml', label: 'XML', type: 'textarea', placeholder: '<root><item>1</item></root>'},
            {
                key: 'minify', label: '압축 (Minify)', type: 'checkbox', default: 'false',
                help: '체크하면 공백 없이 한 줄로 출력합니다',
            },
            {
                key: 'indentWidth', label: '들여쓰기 폭', type: 'select', options: ['2', '4', '8'], default: '2',
                help: '압축 해제 시 적용되는 들여쓰기 칸 수',
            },
            {
                key: 'declaration', label: 'XML 선언 포함', type: 'checkbox', default: 'false',
                help: '<?xml version="1.0" encoding="UTF-8"?> 선언을 앞에 붙입니다',
            },
        ],
        sample: {xml: '<root><item id="1"><name>foo</name></item><item id="2"><name>bar</name></item></root>'},
    },
}
