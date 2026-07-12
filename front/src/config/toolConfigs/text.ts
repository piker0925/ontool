import type {ModuleConfig} from './types'

export const TEXT_CONFIGS: Record<string, ModuleConfig> = {
    'text-diff': {
        params: [
            {key: 'original', label: '원본 텍스트', type: 'textarea', placeholder: '원본 텍스트 입력...'},
            {key: 'revised', label: '수정된 텍스트', type: 'textarea', placeholder: '수정된 텍스트 입력...'},
        ],
        sample: {
            original: 'The quick brown fox\njumps over the lazy dog',
            revised: 'The quick red fox\nleaps over the lazy dog',
        },
    },
    'regex-tester': {
        params: [
            {key: 'pattern', label: '정규식 패턴', type: 'text', placeholder: '[a-z]+'},
            {key: 'text', label: '테스트 텍스트', type: 'textarea', placeholder: '검사할 텍스트 입력...'},
        ],
        sample: {pattern: '[a-z]+@[a-z]+\\.[a-z]{2,}', text: 'contact: alice@example.com, bob@test.org'},
    },
    'case-converter': {
        params: [
            {key: 'text', label: '텍스트', type: 'text', placeholder: 'myVariableName'},
            {key: 'from', label: 'From', type: 'select', options: ['camel', 'pascal', 'snake', 'kebab'], default: 'camel'},
            {key: 'to', label: 'To', type: 'select', options: ['camel', 'pascal', 'snake', 'kebab'], default: 'snake'},
        ],
        sample: {text: 'myVariableName'},
    },
}
