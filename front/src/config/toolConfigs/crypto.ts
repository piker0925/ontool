import type {ModuleConfig} from './types'

export const CRYPTO_CONFIGS: Record<string, ModuleConfig> = {
    'multi-hash': {
        params: [
            {key: 'text', label: '텍스트', type: 'textarea', placeholder: '해시를 생성할 텍스트'},
            {key: 'uppercase', label: '대문자 출력', type: 'checkbox', default: 'false'},
        ],
        sample: {text: 'hello world'},
    },
}
