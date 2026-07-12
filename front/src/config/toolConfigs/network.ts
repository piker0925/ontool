import type {ModuleConfig} from './types'

export const NETWORK_CONFIGS: Record<string, ModuleConfig> = {
    'url-parser': {
        params: [{
            key: 'url',
            label: 'URL',
            type: 'text',
            placeholder: 'https://user:pass@example.com:8443/path?q=1#hash',
            help: '스킴·사용자정보·호스트·포트·경로·쿼리·프래그먼트를 필드별로 분해합니다',
        }],
        sample: {url: 'https://user:pass@example.com:8443/path%20to/page?q=dev%20toolbox&lang=ko#section'},
    },
    'subnet-calc': {
        params: [{
            key: 'cidr',
            label: 'CIDR 표기',
            type: 'text',
            placeholder: '192.168.1.0/24',
            help: '네트워크·브로드캐스트·호스트 범위와 주소 분류(Private/Loopback 등)를 계산합니다',
        }],
        sample: {cidr: '192.168.1.0/24'},
    },
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
