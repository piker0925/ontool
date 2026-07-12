import type {ModuleConfig} from './types'

export const SECURITY_CONFIGS: Record<string, ModuleConfig> = {
    'bcrypt': {
        params: [
            {
                key: 'mode', label: '모드', type: 'select', options: ['hash', 'verify'], default: 'hash',
                help: 'hash: 해시 생성 · verify: 비밀번호와 해시 일치 검증',
            },
            {key: 'password', label: '비밀번호', type: 'text', placeholder: '해시/검증할 비밀번호 입력'},
            {
                key: 'hash', label: 'BCrypt 해시', type: 'text', placeholder: '$2a$10$...',
                help: 'verify 모드에서만 사용 — 비교할 해시 입력',
            },
            {
                key: 'rounds', label: 'Rounds (강도)', type: 'number', default: '10',
                help: 'hash 모드 · 4~31 (10~12 권장) · 10≈100ms, 12≈400ms, 13+≈1초 이상',
            },
        ],
        sample: {password: 'p@ssw0rd!', mode: 'hash', rounds: '10'},
    },
    'rsa-key': {
        params: [
            {key: 'preset', label: '키 유형 / 크기', type: 'select', options: ['RSA-2048', 'RSA-4096', 'EC-256', 'EC-384', 'EC-521'], default: 'RSA-2048'},
        ],
    },
}

export const SECURITY_HEAVY_CONFIGS: Record<string, ModuleConfig> = {
    'vuln-scan': {
        params: [],
        fileAccept: '.gradle,.kts,.xml',
    },
}
