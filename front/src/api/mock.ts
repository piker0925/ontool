import type {Module} from '../types'

export const MOCK_MODULES: Module[] = [
    // PDF (Heavy)
    {id: 'image-to-pdf', name: 'Image → PDF', category: 'PDF', isHeavy: true, description: '이미지를 하나의 PDF로 묶기'},
    {id: 'pdf-merge', name: 'PDF 병합', category: 'PDF', isHeavy: true, description: '여러 PDF를 하나로 병합'},
    {id: 'pdf-split', name: 'PDF 분할', category: 'PDF', isHeavy: true, description: 'PDF를 페이지 단위로 분할'},
    {id: 'markdown-to-pdf', name: 'Markdown → PDF', category: 'PDF', isHeavy: true, description: 'Markdown 문서를 PDF로 변환'},

    // 이미지 (Heavy)
    {id: 'image-resize', name: '이미지 리사이즈', category: '이미지', isHeavy: true, description: '이미지 크기 및 해상도 조정'},
    {id: 'image-format', name: '이미지 포맷 변환', category: '이미지', isHeavy: true, description: 'PNG, JPG, WebP 등 포맷 변환'},
    {id: 'gif-create', name: 'GIF 생성', category: '이미지', isHeavy: true, description: '이미지 시퀀스를 GIF로 변환'},

    // 생성기
    {id: 'json-schema-to-dto', name: 'JSON Schema → DTO', category: '생성기', isHeavy: true, description: 'JSON Schema로 Java DTO 클래스 생성'},
    {id: 'openapi-to-code', name: 'OpenAPI → 코드', category: '생성기', isHeavy: true, description: 'OpenAPI 스펙으로 클라이언트 코드 생성'},

    // 보안·암호화
    {id: 'rsa-key', name: 'RSA 키 생성', category: '보안·암호화', isHeavy: false, description: 'RSA 공개키/개인키 쌍 생성'},
    {id: 'bcrypt', name: 'Bcrypt 해시', category: '보안·암호화', isHeavy: false, description: '비밀번호 Bcrypt 해시 생성 및 검증'},
    {id: 'vuln-scan', name: '취약점 스캔', category: '보안·암호화', isHeavy: true, description: '의존성 파일(Gradle/Maven) CVE 취약점 검사'},
    {
        id: 'multi-hash',
        name: '다중 해시',
        category: '보안·암호화',
        isHeavy: false,
        description: 'MD5 · SHA-1 · SHA-256 · SHA-512 동시 생성',
        keywords: ['sha256', 'sha-256', 'md5', 'sha512', 'hash', '해시']
    },
    {id: 'hmac', name: 'HMAC 서명', category: '보안·암호화', isHeavy: false, isFrontendOnly: true, description: 'HMAC-SHA1/256/512·MD5 서명 생성'},
    {id: 'aes', name: 'AES 암호화', category: '보안·암호화', isHeavy: false, isFrontendOnly: true, description: 'AES CBC/GCM/CTR 암호화/복호화'},
    {
        id: 'totp', name: 'TOTP 생성', category: '보안·암호화', isHeavy: false, isFrontendOnly: true,
        description: 'TOTP 일회용 코드 생성 (RFC 6238)',
        keywords: ['otp', '2fa', 'authenticator', '일회용'],
    },

    // 포맷터
    {id: 'sql-formatter', name: 'SQL 포맷터', category: '포맷터', isHeavy: false, description: 'SQL 쿼리 정렬 및 포맷'},
    {id: 'xml-formatter', name: 'XML 포맷터', category: '포맷터', isHeavy: false, description: 'XML 문서 들여쓰기 정렬'},

    // 텍스트
    {
        id: 'text-diff', name: 'Diff 비교', category: '텍스트', isHeavy: false, isFrontendOnly: true,
        description: '두 텍스트 차이 시각화', keywords: ['diff', 'compare', '비교'],
    },
    {
        id: 'regex-tester', name: 'Regex 테스터', category: '텍스트', isHeavy: false, isFrontendOnly: true,
        description: '정규표현식 실시간 테스트', keywords: ['regex', 'regexp', '정규식', '정규표현식'],
    },

    // 네트워크
    {id: 'url-parser', name: 'URL 파서', category: '네트워크', isHeavy: false, isFrontendOnly: true, description: 'URL 구성 요소 분해 및 파싱'},
    {id: 'subnet-calc', name: '서브넷 계산기', category: '네트워크', isHeavy: false, isFrontendOnly: true, description: 'IP 서브넷 마스크 계산'},
    {id: 'html-fetch', name: 'HTML 가져오기', category: '네트워크', isHeavy: false, description: 'URL에서 HTML 소스 가져오기'},

    // DevOps
    {id: 'cron', name: 'Cron 표현식', category: 'DevOps', isHeavy: false, isFrontendOnly: true, description: 'Cron 표현식 파싱 및 다음 실행 시각'},
    {id: 'docker-compose', name: 'Docker Compose 변환', category: 'DevOps', isHeavy: false, description: 'docker run 명령어 → docker-compose.yml 변환'},

    // 프론트엔드 전용 도구 (브라우저에서 직접 처리)
    {id: 'json-formatter', name: 'JSON 포맷터', category: '포맷터', isHeavy: false, isFrontendOnly: true, description: 'JSON 정렬 및 미니파이'},
    {id: 'jwt-decoder', name: 'JWT 디코더', category: '포맷터', isHeavy: false, isFrontendOnly: true, description: 'JWT 토큰 Header·Payload 파싱'},
    {id: 'timestamp', name: '타임스탬프', category: '포맷터', isHeavy: false, isFrontendOnly: true, description: 'Unix timestamp ↔ 날짜/시간 변환'},
    {id: 'color-code', name: '색상 코드', category: '포맷터', isHeavy: false, isFrontendOnly: true, description: 'HEX ↔ RGB ↔ HSL 변환'},
    {id: 'uuid', name: 'UUID 생성기', category: '생성기', isHeavy: false, isFrontendOnly: true, description: 'UUID v4 무작위 생성'},

    // 통합 도구 (여러 도구를 하나의 화면으로 흡수)
    {
        id: 'encoder', name: '인코더/디코더', category: '포맷터', isHeavy: false, isFrontendOnly: true,
        description: 'Base64 · URL · HTML Entity 인코딩/디코딩',
        keywords: [
            {keyword: 'base64', query: 'mode=base64-encode'},
            {keyword: 'url encode', query: 'mode=url-encode'},
            {keyword: 'url 인코딩', query: 'mode=url-encode'},
            {keyword: 'html entity', query: 'mode=html-encode'},
            {keyword: 'escape', query: 'mode=html-encode'},
            '인코딩', '디코딩',
        ],
    },
    {
        id: 'data-convert', name: '데이터 포맷 변환', category: '포맷터', isHeavy: false, isFrontendOnly: true,
        description: 'JSON · YAML · TOML · XML · CSV 상호 변환',
        keywords: [
            {keyword: 'yaml', query: 'from=json&to=yaml'},
            {keyword: 'json-yaml', query: 'from=json&to=yaml'},
            {keyword: 'toml', query: 'from=json&to=toml'},
            {keyword: 'xml', query: 'from=json&to=xml'},
            {keyword: 'csv', query: 'from=csv&to=json'},
            {keyword: 'csv-json', query: 'from=csv&to=json'},
            'json', '변환',
        ],
    },
    {
        id: 'text-utils', name: '텍스트 유틸', category: '텍스트', isHeavy: false, isFrontendOnly: true,
        description: '케이스 변환 · 글자 수 · 한영 변환 · 공백 정규화',
        keywords: [
            {keyword: 'case', query: 'tab=case'},
            {keyword: 'camel', query: 'tab=case'},
            {keyword: 'snake', query: 'tab=case'},
            {keyword: 'kebab', query: 'tab=case'},
            {keyword: '케이스', query: 'tab=case'},
            {keyword: '글자 수', query: 'tab=count'},
            {keyword: 'count', query: 'tab=count'},
            {keyword: '한영', query: 'tab=keyboard'},
            {keyword: '공백', query: 'tab=whitespace'},
            {keyword: 'whitespace', query: 'tab=whitespace'},
        ],
    },
    {
        id: 'code-gen', name: '코드 생성기', category: '생성기', isHeavy: false, isFrontendOnly: true,
        description: 'QR · 바코드 생성',
        keywords: [
            {keyword: 'qr', query: 'format=qr'},
            {keyword: 'qr 코드', query: 'format=qr'},
            {keyword: 'barcode', query: 'format=code128'},
            {keyword: '바코드', query: 'format=code128'},
            {keyword: 'code128', query: 'format=code128'},
        ],
    },
]
