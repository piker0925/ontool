import type {ModuleConfig} from './types'

export const NETWORK_CONFIGS: Record<string, ModuleConfig> = {
    'html-fetch': {
        params: [{
            key: 'url',
            label: 'URL',
            type: 'text',
            placeholder: 'https://example.com',
            help: '사설 IP·localhost 등 내부 주소는 차단됩니다. 리다이렉트 최대 3회, 응답 1MB 제한',
        }],
        sample: {url: 'https://example.com'},
    },
}
