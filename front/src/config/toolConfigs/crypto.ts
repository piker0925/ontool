import type {ModuleConfig} from './types'

export const CRYPTO_CONFIGS: Record<string, ModuleConfig> = {
    'hmac': {
        params: [
            {key: 'text', label: '메시지', type: 'textarea', placeholder: 'HMAC 서명할 텍스트'},
            {
                key: 'key', label: '서명 키', type: 'text', placeholder: 'secret-key',
                help: '16바이트 이상 키 권장',
            },
            {
                key: 'keyFormat', label: '키 형식', type: 'select',
                options: ['utf8', 'hex', 'base64'], default: 'utf8',
                help: 'Hex/Base64로 인코딩된 바이너리 키면 해당 형식 선택',
            },
            {
                key: 'algorithm', label: '알고리즘', type: 'select',
                options: ['HmacSHA256', 'HmacSHA512', 'HmacSHA1', 'HmacMD5'], default: 'HmacSHA256',
            },
            {key: 'format', label: '출력 형식', type: 'select', options: ['hex', 'base64'], default: 'hex'},
        ],
        sample: {text: 'hello world', key: 'secret-key'},
    },
    'aes': {
        params: [
            {key: 'text', label: '텍스트', type: 'textarea', placeholder: '암호화/복호화할 텍스트'},
            {
                key: 'key', label: 'AES 키', type: 'text', placeholder: '16·24·32자 키',
                help: '16자=AES-128, 24자=AES-192, 32자=AES-256 (짧으면 0으로 자동 패딩)',
            },
            {key: 'mode', label: '모드', type: 'select', options: ['encrypt', 'decrypt'], default: 'encrypt'},
            {
                key: 'cipherMode', label: '암호화 방식', type: 'select',
                options: ['CBC', 'GCM', 'CTR', 'ECB'], default: 'CBC',
                help: 'GCM은 인증 암호화(AEAD)로 더 안전. ECB는 패턴 노출 위험',
            },
            {
                key: 'iv', label: 'IV / Nonce (Hex, 선택)', type: 'text',
                placeholder: '비우면 자동 생성 (권장)',
                help: 'CBC·CTR 16바이트(32 Hex), GCM 12바이트(24 Hex). 직접 입력 시 결과에 IV가 포함되지 않으며, 고정 IV 재사용은 위험',
            },
            {key: 'format', label: '암호문 형식', type: 'select', options: ['base64', 'hex'], default: 'base64'},
        ],
        sample: {text: '민감한 데이터', key: '0123456789abcdef'},
    },
    'multi-hash': {
        params: [
            {key: 'text', label: '텍스트', type: 'textarea', placeholder: '해시를 생성할 텍스트'},
            {key: 'uppercase', label: '대문자 출력', type: 'checkbox', default: 'false'},
        ],
        sample: {text: 'hello world'},
    },
}
