// .js 확장자 필수: vite.config.ts → build/sitemap.ts가 MOCK_MODULES를 nodenext 해석 컨텍스트로
// 끌어들인다(tsconfig.node.json). 확장자를 지우면 그쪽 타입체크가 깨진다 — 의도적인 예외.
import type {Module} from '../types/index.js'

export const MOCK_MODULES: Module[] = [
    // PDF (Heavy)
    {id: 'image-to-pdf', name: 'Image → PDF', category: 'PDF', isHeavy: true, description: '이미지를 하나의 PDF로 묶기', zones: ['files']},
    {id: 'pdf-merge', name: 'PDF 병합', category: 'PDF', isHeavy: true, description: '여러 PDF를 하나로 병합', zones: ['files']},
    {id: 'pdf-split', name: 'PDF 분할', category: 'PDF', isHeavy: true, description: 'PDF를 페이지 단위로 분할', zones: ['files']},
    {id: 'markdown-to-pdf', name: 'Markdown → PDF', category: 'PDF', isHeavy: true, description: 'Markdown 문서를 PDF로 변환', zones: ['files']},

    // 이미지 (Heavy)
    {id: 'image-resize', name: '이미지 리사이즈', category: '이미지', isHeavy: true, description: '이미지 크기 및 해상도 조정', zones: ['files']},
    {id: 'image-format', name: '이미지 포맷 변환', category: '이미지', isHeavy: true, description: 'PNG, JPG, WebP 등 포맷 변환', zones: ['files']},
    {id: 'gif-create', name: 'GIF 생성', category: '이미지', isHeavy: true, description: '이미지 시퀀스를 GIF로 변환 (자막 옵션 포함)', zones: ['files']},
    {id: 'exif-remove', name: 'EXIF 제거', category: '이미지', isHeavy: true, description: '이미지의 촬영 위치·기기 등 EXIF 메타데이터를 무손실로 제거', zones: ['files']},
    {id: 'image-collage', name: '이미지 콜라주', category: '이미지', isHeavy: true, description: '여러 이미지를 격자로 합성', zones: ['files']},

    // 영상 (Heavy, VIDEO 레인)
    {id: 'video-trim-convert', name: '영상 트리밍/변환', category: '영상', isHeavy: true, description: '구간 자르기, 컨테이너/해상도/비트레이트 변환', zones: ['files']},
    {id: 'video-to-gif', name: '영상 → GIF', category: '영상', isHeavy: true, description: '영상 구간을 고품질 팔레트 GIF로 변환', zones: ['files']},
    {id: 'video-frame-extract', name: '프레임 추출', category: '영상', isHeavy: true, description: 'N초 간격 또는 총 N장 균등으로 정지 프레임 추출', zones: ['files']},
    {id: 'video-metadata', name: '영상 메타데이터', category: '영상', isHeavy: true, description: '해상도·코덱·길이·비트레이트·프레임레이트·크기 조회', zones: ['files']},
    {id: 'video-to-audio', name: '영상 → 오디오 추출', category: '영상', isHeavy: true, description: '영상 파일에서 오디오 트랙만 mp3/wav로 추출', zones: ['files']},
    {id: 'video-merge', name: '영상 병합', category: '영상', isHeavy: true, description: '여러 영상 클립을 순서대로 하나로 합치기', zones: ['files']},
    {id: 'video-watermark', name: '영상 워터마크', category: '영상', isHeavy: true, description: '이미지 또는 텍스트 워터마크를 영상에 삽입', zones: ['files']},

    // 생성기
    {id: 'json-schema-to-dto', name: 'JSON Schema → DTO', category: '생성기', isHeavy: true, description: 'JSON Schema로 Java DTO 클래스 생성', zones: ['dev']},
    {id: 'openapi-to-code', name: 'OpenAPI → 코드', category: '생성기', isHeavy: true, description: 'OpenAPI 스펙으로 클라이언트 코드 생성', zones: ['dev']},

    // 보안·암호화
    {id: 'rsa-key', name: 'RSA 키 생성', category: '보안·암호화', isHeavy: false, description: 'RSA 공개키/개인키 쌍 생성', zones: ['dev']},
    {id: 'bcrypt', name: 'Bcrypt 해시', category: '보안·암호화', isHeavy: false, description: '비밀번호 Bcrypt 해시 생성 및 검증', zones: ['dev']},
    {id: 'vuln-scan', name: '취약점 스캔', category: '보안·암호화', isHeavy: true, description: '의존성 파일(Gradle/Maven) CVE 취약점 검사', zones: ['dev']},
    {
        id: 'multi-hash',
        name: '다중 해시',
        category: '보안·암호화',
        isHeavy: false,
        description: 'MD5 · SHA-1 · SHA-256 · SHA-512 동시 생성',
        keywords: ['sha256', 'sha-256', 'md5', 'sha512', 'hash', '해시'],
        zones: ['dev'],
    },
    {id: 'hmac', name: 'HMAC 서명', category: '보안·암호화', isHeavy: false, isFrontendOnly: true, description: 'HMAC-SHA1/256/512·MD5 서명 생성', zones: ['dev']},
    {id: 'aes', name: 'AES 암호화', category: '보안·암호화', isHeavy: false, isFrontendOnly: true, description: 'AES CBC/GCM/CTR 암호화/복호화', zones: ['dev']},
    {
        id: 'totp', name: 'TOTP 생성', category: '보안·암호화', isHeavy: false, isFrontendOnly: true,
        description: 'TOTP 일회용 코드 생성 (RFC 6238)',
        keywords: ['otp', '2fa', 'authenticator', '일회용'],
        zones: ['dev'],
    },

    // 포맷터
    {id: 'sql-formatter', name: 'SQL 포맷터', category: '포맷터', isHeavy: false, description: 'SQL 쿼리 정렬 및 포맷', zones: ['dev']},
    {id: 'xml-formatter', name: 'XML 포맷터', category: '포맷터', isHeavy: false, description: 'XML 문서 들여쓰기 정렬', zones: ['dev']},
    {
        id: 'svg-optimizer', name: 'SVG 최적화기', category: '포맷터', isHeavy: false, isFrontendOnly: true,
        description: '불필요한 메타데이터·주석·과도한 좌표 정밀도를 제거해 SVG 용량 절감',
        keywords: ['svg', 'svgo', '최적화'],
        zones: ['dev'],
    },

    // 텍스트
    {
        id: 'text-diff', name: 'Diff 비교', category: '텍스트', isHeavy: false, isFrontendOnly: true,
        description: '두 텍스트 차이 시각화', keywords: ['diff', 'compare', '비교'],
        zones: ['dev'],
    },
    {
        id: 'regex-tester', name: 'Regex 테스터', category: '텍스트', isHeavy: false, isFrontendOnly: true,
        description: '정규표현식 실시간 테스트', keywords: ['regex', 'regexp', '정규식', '정규표현식'],
        zones: ['dev'],
    },

    // 네트워크
    {id: 'url-parser', name: 'URL 파서', category: '네트워크', isHeavy: false, isFrontendOnly: true, description: 'URL 구성 요소 분해 및 파싱', zones: ['dev']},
    {id: 'subnet-calc', name: '서브넷 계산기', category: '네트워크', isHeavy: false, isFrontendOnly: true, description: 'IP 서브넷 마스크 계산', zones: ['dev']},
    {id: 'html-fetch', name: 'HTML 가져오기', category: '네트워크', isHeavy: false, description: 'URL에서 HTML 소스 가져오기', zones: ['dev']},

    // DevOps
    {id: 'cron', name: 'Cron 표현식', category: 'DevOps', isHeavy: false, isFrontendOnly: true, description: 'Cron 표현식 파싱 및 다음 실행 시각', zones: ['dev']},
    {id: 'docker-compose', name: 'Docker Compose 변환', category: 'DevOps', isHeavy: false, description: 'docker run 명령어 → docker-compose.yml 변환', zones: ['dev']},
    {
        id: 'curl-to-code', name: 'curl → 코드', category: 'DevOps', isHeavy: false, isFrontendOnly: true,
        description: 'curl 명령을 JavaScript fetch·Python requests 코드로 변환',
        keywords: ['curl', 'fetch', 'requests'],
        zones: ['dev'],
    },
    {
        id: 'gitignore-generator', name: '.gitignore 생성기', category: 'DevOps', isHeavy: false, isFrontendOnly: true,
        description: '언어·프레임워크 템플릿을 선택해 .gitignore 생성',
        keywords: ['gitignore', 'git ignore'],
        zones: ['dev'],
    },

    // 프론트엔드 전용 도구 (브라우저에서 직접 처리)
    {id: 'jwt-decoder', name: 'JWT 디코더', category: '포맷터', isHeavy: false, isFrontendOnly: true, description: 'JWT 토큰 Header·Payload 파싱', zones: ['dev']},
    {id: 'timestamp', name: '타임스탬프', category: '포맷터', isHeavy: false, isFrontendOnly: true, description: 'Unix timestamp ↔ 날짜/시간 변환', zones: ['dev']},
    {id: 'color-code', name: '색상 코드', category: '포맷터', isHeavy: false, isFrontendOnly: true, description: 'HEX ↔ RGB ↔ HSL 변환', zones: ['dev']},
    {id: 'uuid', name: 'UUID 생성기', category: '생성기', isHeavy: false, isFrontendOnly: true, description: 'UUID v4 무작위 생성', zones: ['dev']},
    {
        id: 'json-to-ts', name: 'JSON → TS 인터페이스', category: '생성기', isHeavy: false, isFrontendOnly: true,
        description: 'JSON 값으로 TypeScript interface 생성',
        keywords: ['typescript', 'interface', 'ts'],
        zones: ['dev'],
    },
    {
        id: 'faker-ko', name: '한국어 더미 데이터 생성기', category: '생성기', isHeavy: false, isFrontendOnly: true,
        description: '이름·전화번호·주소·이메일·회사명 등 한국형 테스트 더미 데이터 대량 생성',
        keywords: ['faker', '더미', 'dummy', '테스트 데이터'],
        zones: ['dev'],
    },

    // 통합 도구 (여러 도구를 하나의 화면으로 흡수)
    {
        id: 'json-formatter', name: 'JSON 도구', category: '포맷터', isHeavy: false, isFrontendOnly: true,
        description: '포맷터 · Diff 뷰어 · JSONPath 플레이그라운드',
        keywords: [
            {keyword: '포맷', query: 'tab=formatter'},
            {keyword: '미니파이', query: 'tab=formatter'},
            {keyword: 'diff', query: 'tab=diff'},
            {keyword: 'jsonpath', query: 'tab=jsonpath'},
            {keyword: 'json path', query: 'tab=jsonpath'},
            'json',
        ],
        zones: ['dev'],
    },
    {
        id: 'markdown-tools', name: '마크다운 도구', category: '텍스트', isHeavy: false, isFrontendOnly: true,
        description: 'TOC(목차) 생성기 · 표 생성기',
        keywords: [
            {keyword: 'toc', query: 'tab=toc'},
            {keyword: '목차', query: 'tab=toc'},
            {keyword: '표', query: 'tab=table'},
            {keyword: 'table', query: 'tab=table'},
            {keyword: 'csv', query: 'tab=table'},
            'markdown', '마크다운',
        ],
        zones: ['dev'],
    },
    {
        id: 'css-tools', name: 'CSS 도구', category: '생성기', isHeavy: false, isFrontendOnly: true,
        description: 'Gradient/Box-shadow 생성기 · 타이포그래피 스케일 계산기',
        keywords: [
            {keyword: 'gradient', query: 'tab=gradient'},
            {keyword: '그라디언트', query: 'tab=gradient'},
            {keyword: '그라데이션', query: 'tab=gradient'},
            {keyword: 'box-shadow', query: 'tab=gradient'},
            {keyword: '그림자', query: 'tab=gradient'},
            {keyword: 'type scale', query: 'tab=typescale'},
            {keyword: '타이포그래피', query: 'tab=typescale'},
            {keyword: '폰트 크기', query: 'tab=typescale'},
            'css',
        ],
        zones: ['dev'],
    },
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
        zones: ['dev'],
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
        zones: ['dev'],
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
        zones: ['dev'],
    },
    {
        id: 'net-pay-calculator', name: '연봉 실수령액 계산기', category: '급여·근로', isHeavy: false, isFrontendOnly: true,
        description: '연봉 세전 → 4대보험·세금 공제 후 월 실수령액 계산',
        keywords: ['실수령액', '연봉 계산기', '연봉 실수령액'],
        zones: ['life'],
    },
    {
        id: 'wage-converter', name: '시급·월급·연봉 변환기', category: '급여·근로', isHeavy: false, isFrontendOnly: true,
        description: '시급↔월급↔연봉 상호 환산, 최저임금 미달 경고',
        keywords: ['시급', '월급', '연봉 환산', '최저임금'],
        zones: ['life'],
    },
    {
        id: 'severance-calculator', name: '퇴직금 계산기', category: '급여·근로', isHeavy: false, isFrontendOnly: true,
        description: '입사일·퇴사일 기준 예상 퇴직금 계산',
        keywords: ['퇴직금', '퇴직금 계산기'],
        zones: ['life'],
    },
    {
        id: 'overtime-pay-calculator', name: '초과근무수당 계산기', category: '급여·근로', isHeavy: false, isFrontendOnly: true,
        description: '주 40시간 초과 근무 가산수당(1.5배) 계산',
        keywords: ['초과근무', '연장근로수당', '야근수당'],
        zones: ['life'],
    },
    {
        id: 'loan-calculator', name: '대출 원리금 계산기', category: '금융', isHeavy: false, isFrontendOnly: true,
        description: '원리금균등·원금균등 상환 방식별 상환표·총 이자 계산',
        keywords: ['대출', '원리금', '상환표', '대출 이자'],
        zones: ['life'],
    },
    {
        id: 'deposit-calculator', name: '예금/적금 계산기', category: '금융', isHeavy: false, isFrontendOnly: true,
        description: '예금(거치식)·적금(적립식) 만기수령액·이자 계산',
        keywords: ['예금', '적금', '만기수령액'],
        zones: ['life'],
    },
    {
        id: 'jeonse-calculator', name: '전월세 전환 계산기', category: '금융', isHeavy: false, isFrontendOnly: true,
        description: '보증금 차액 ↔ 월세 전환, 법정 상한(기준금리+2.0%p) 비교',
        keywords: ['전월세', '전세', '전월세 전환율'],
        zones: ['life'],
    },
    {
        id: 'vat-calculator', name: '부가세 계산기', category: '금융', isHeavy: false, isFrontendOnly: true,
        description: '공급가액 ↔ 부가세 포함가 상호 계산(세율 10%)',
        keywords: ['부가세', '부가가치세'],
        zones: ['life'],
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
        zones: ['dev'],
    },
    {
        id: 'pdf-watermark', name: '워터마크 삽입', category: 'PDF', isHeavy: false, isFrontendOnly: true,
        description: 'PDF·이미지에 텍스트/이미지 워터마크 삽입 — 드래그 배치, 배경 전체 채우기 지원',
        keywords: ['워터마크', 'watermark'],
        zones: ['files'],
    },
    {
        id: 'pdf-password', name: 'PDF 비밀번호 설정/해제', category: 'PDF', isHeavy: false, isFrontendOnly: true,
        description: 'PDF 열람 비밀번호를 설정하거나 제거',
        keywords: ['비밀번호', 'password', 'PDF 암호'],
        zones: ['files'],
    },
    {
        id: 'pdf-header-footer', name: '헤더/푸터/페이지번호', category: 'PDF', isHeavy: false, isFrontendOnly: true,
        description: 'PDF 각 페이지에 헤더·푸터·페이지 번호 삽입',
        keywords: ['헤더', '푸터', '페이지번호'],
        zones: ['files'],
    },
    {
        id: 'document-generator', name: '문서 생성기', category: 'PDF', isHeavy: false, isFrontendOnly: true,
        description: '청구서 PDF 생성',
        keywords: ['청구서', '인보이스', 'invoice'],
        zones: ['files'],
    },
    {
        id: 'bmi', name: 'BMI 계산기', category: '건강', isHeavy: false, isFrontendOnly: true,
        description: '체중·신장으로 BMI와 체중 상태 계산',
        keywords: ['bmi', '체질량지수'],
        zones: ['life'],
    },
    {
        id: 'bmr-calculator', name: '기초대사량 계산기', category: '건강', isHeavy: false, isFrontendOnly: true,
        description: '기초대사량(BMR)·활동대사량(TDEE) 계산',
        keywords: ['기초대사량', 'bmr', 'tdee', '칼로리'],
        zones: ['life'],
    },
    {
        id: 'unit-converter', name: '단위 변환기', category: '단위·변환', isHeavy: false, isFrontendOnly: true,
        description: '길이·무게·부피 단위 변환',
        keywords: ['단위 변환', 'unit', '길이', '무게', '부피', 'cm', 'kg', 'in', 'lb'],
        zones: ['life'],
    },
    {
        id: 'parcel-volume-weight', name: '택배 부피무게 계산기', category: '단위·변환', isHeavy: false, isFrontendOnly: true,
        description: '가로×세로×높이로 부피무게 계산, 실중량과 비교해 청구 기준 안내',
        keywords: ['택배', '부피무게', '부피중량', '박스', '운임'],
        zones: ['life'],
    },
    {
        id: 'pet-age-converter', name: '반려동물 나이 변환기', category: '날짜·나이', isHeavy: false, isFrontendOnly: true,
        description: '강아지·고양이 나이를 사람 나이로 환산',
        keywords: ['반려동물', '강아지 나이', '고양이 나이', '펫 나이'],
        zones: ['life', 'fun'],
    },
    {
        id: 'timezone-converter', name: '타임존 변환기', category: '단위·변환', isHeavy: false, isFrontendOnly: true,
        description: '시간대 간 날짜·시각 변환(원격/해외 협업용)',
        keywords: ['타임존', 'timezone', '시간대 변환', 'utc', 'kst'],
        zones: ['dev', 'life'],
    },
    {
        id: 'd-day-calculator', name: 'D-Day/날짜 차이 계산기', category: '날짜·나이', isHeavy: false, isFrontendOnly: true,
        description: '두 날짜 사이의 D-Day·일수 계산',
        keywords: ['d-day', '디데이', '날짜 차이', '기념일'],
        zones: ['life'],
    },
    {
        id: 'age-calculator', name: '만 나이 계산기', category: '날짜·나이', isHeavy: false, isFrontendOnly: true,
        description: '생년월일 기준 만 나이 계산',
        keywords: ['만 나이', '나이 계산', '한국 나이'],
        zones: ['life'],
    },
    {
        id: 'baby-age-calculator', name: '육아 개월수 계산기', category: '날짜·나이', isHeavy: false, isFrontendOnly: true,
        description: '출생일 기준 개월수·일수 계산',
        keywords: ['육아', '개월수', '아기 개월수'],
        zones: ['life'],
    },
    {
        id: 'due-date-calculator', name: '출산예정일 계산기', category: '날짜·나이', isHeavy: false, isFrontendOnly: true,
        description: '최종 월경일 기준 출산예정일·임신 주수 계산(네겔레 법칙)',
        keywords: ['출산예정일', '임신 주수', '임신 계산기'],
        zones: ['life'],
    },

    // 재미
    {
        id: 'lotto-number', name: '로또 번호 생성기', category: '재미', isHeavy: false, isFrontendOnly: true,
        description: '1~45 중 중복 없는 로또 번호 6개 무작위 생성',
        keywords: ['로또', 'lotto'],
        zones: ['fun'],
    },
    {
        id: 'lotto-simulator', name: '로또 시뮬레이터', category: '재미', isHeavy: false, isFrontendOnly: true,
        description: '목표 번호를 정해두고 무작위 구매를 반복해 당첨 확률을 체감하는 시뮬레이터',
        keywords: ['로또 시뮬레이터', 'lotto simulator', '확률'],
        zones: ['fun'],
    },
    {
        id: 'random-team-ladder', name: '랜덤 팀 나누기·사다리타기', category: '재미', isHeavy: false, isFrontendOnly: true,
        description: '참가자 무작위 팀 분배 또는 사다리타기 경로 배정',
        keywords: ['팀 나누기', '사다리타기', '사다리', 'ladder'],
        zones: ['fun'],
    },
    {
        id: 'random-nickname', name: '랜덤 닉네임 생성기', category: '재미', isHeavy: false, isFrontendOnly: true,
        description: '형용사+명사 조합 무작위 한국어 닉네임 생성',
        keywords: ['닉네임', 'nickname'],
        zones: ['fun'],
    },
    {
        id: 'random-palette', name: '색상 팔레트 생성기', category: '재미', isHeavy: false, isFrontendOnly: true,
        description: '보색·유사색 등 규칙 기반 무작위 색상 팔레트 생성',
        keywords: ['팔레트', 'palette', '색상 조합'],
        zones: ['dev', 'fun'],
    },
    {
        id: 'wordcloud', name: '워드클라우드', category: '재미', isHeavy: false, isFrontendOnly: true,
        description: '텍스트 빈도 분석 — 워드클라우드 시각화 · 빈도표',
        keywords: [
            {keyword: '워드클라우드', query: 'tab=cloud'},
            {keyword: 'wordcloud', query: 'tab=cloud'},
            {keyword: '텍스트 빈도', query: 'tab=table'},
            {keyword: '단어 빈도', query: 'tab=table'},
            {keyword: '빈도 분석', query: 'tab=table'},
        ],
        zones: ['fun', 'dev'],
    },

    // 미니게임 (프론트 전용, 상태는 컴포넌트 내부 — 서버 저장 없음, v3 이전 범위. ADR-0026)
    // component 로더는 여기 두지 않는다 — config/shellComponents.ts와 그 주석 참고.
    {
        id: 'game-reaction-time', name: '반응속도 테스트', category: '게임', isHeavy: false, isFrontendOnly: true,
        description: '신호가 뜨면 최대한 빨리 클릭해 반응 속도를 측정',
        kind: 'game', zones: ['fun'],
    },
    {
        id: 'game-2048', name: '2048', category: '게임', isHeavy: false, isFrontendOnly: true,
        description: '같은 숫자 타일을 합쳐 2048을 만드는 퍼즐',
        kind: 'game', zones: ['fun'],
    },
    {
        id: 'game-minesweeper', name: '지뢰찾기', category: '게임', isHeavy: false, isFrontendOnly: true,
        description: '지뢰를 피해 안전한 칸을 모두 여는 클래식 퍼즐',
        kind: 'game', zones: ['fun'],
    },
    {
        id: 'game-memory-cards', name: '카드 짝맞추기', category: '게임', isHeavy: false, isFrontendOnly: true,
        description: '카드 두 장을 뒤집어 같은 짝을 찾는 기억력 게임',
        kind: 'game', zones: ['fun'],
    },
    {
        id: 'game-snake', name: '스네이크', category: '게임', isHeavy: false, isFrontendOnly: true,
        description: '방향키로 뱀을 조종해 먹이를 먹고 길이를 늘리는 클래식 게임',
        kind: 'game', zones: ['fun'],
    },
    {
        id: 'game-simon', name: '사이먼', category: '게임', isHeavy: false, isFrontendOnly: true,
        description: '색상 순서를 기억해 그대로 따라 클릭하는 순서 기억 게임',
        kind: 'game', zones: ['fun'],
    },
    {
        id: 'game-baseball', name: '숫자야구', category: '게임', isHeavy: false, isFrontendOnly: true,
        description: '중복 없는 숫자를 스트라이크·볼 힌트로 추리하는 게임',
        kind: 'game', zones: ['fun'],
    },
    {
        id: 'game-tictactoe', name: '틱택토', category: '게임', isHeavy: false, isFrontendOnly: true,
        description: '컴퓨터를 상대로 3x3 판에서 한 줄을 먼저 만드는 삼목 게임',
        kind: 'game', zones: ['fun'],
    },
    // 게임은 아니지만 078의 상주형 게임 페이지 모델(GamePage)을 그대로 재사용한다 — kind는 'tool'(생략)로
    // 두어 게임 카테고리에 섞이지 않게 하고, 생산성 도구로 분류한다(component 로더는 여전히
    // shellComponents.ts를 거친다 — 렌더은 kind가 아니라 component로 결정되므로 무관, ADR-0026).
    // '생활' 카테고리는 main 병합 시점(ADR-0028)에 급여·근로/금융/날짜·나이/건강/단위·변환으로
    // 이미 세분화되어 있었고 뽀모도로에 맞는 게 없어 '생산성' 카테고리를 새로 만들었다.
    {
        id: 'pomodoro', name: '뽀모도로 타이머', category: '생산성', isHeavy: false, isFrontendOnly: true,
        description: '작업/휴식 사이클을 반복하는 뽀모도로 타이머·스톱워치',
        zones: ['life'],
    },

    // 이미지 유틸 (프론트 로컬, 캔버스 기반)
    {
        id: 'image-crop-social', name: '소셜 이미지 크롭', category: '이미지', isHeavy: false, isFrontendOnly: true,
        description: '플랫폼별 비율 프리셋으로 이미지 크롭',
        keywords: ['crop', '크롭', '인스타그램', 'instagram', '유튜브 썸네일'],
        zones: ['files'],
    },
    {
        id: 'image-diff', name: '이미지 Diff 비교', category: '이미지', isHeavy: false, isFrontendOnly: true,
        description: '두 이미지의 픽셀 단위 차이를 히트맵으로 시각화',
        keywords: ['diff', '비교', 'compare', '이미지 비교'],
        zones: ['files', 'dev'],
    },
    {
        id: 'colorblind-simulator', name: '색약 시뮬레이터', category: '이미지', isHeavy: false, isFrontendOnly: true,
        description: '적색맹·녹색맹·청색맹 시야로 이미지 미리보기',
        keywords: ['색약', 'colorblind', '색맹', 'protanopia', 'deuteranopia'],
        zones: ['files', 'dev'],
    },
    {
        id: 'favicon-generator', name: 'Favicon 생성기', category: '이미지', isHeavy: false, isFrontendOnly: true,
        description: '이미지 하나로 다중 사이즈 favicon.ico + PNG 세트 생성',
        keywords: ['favicon', '파비콘', 'ico'],
        zones: ['files'],
    },
    {
        id: 'image-to-ascii', name: '이미지 → 아스키 아트', category: '이미지', isHeavy: false, isFrontendOnly: true,
        description: '이미지를 그레이스케일 문자 아트로 변환',
        keywords: ['ascii', '아스키', 'ascii art'],
        zones: ['files', 'fun'],
    },

    // 문서 뷰어 (프론트 로컬, 서버 전송 없이 브라우저에서 렌더)
    {
        id: 'document-viewer', name: '문서 뷰어', category: '문서', isHeavy: false, isFrontendOnly: true, kind: 'viewer',
        description: 'DOCX·XLSX 파일을 업로드 없이 브라우저에서 바로 미리보기',
        keywords: ['docx', 'xlsx', '워드', '엑셀', '문서 미리보기', 'viewer'],
        zones: ['files'],
    },
    {
        id: 'audio-pitch', name: '오디오 피치 조절', category: '오디오', isHeavy: false, isFrontendOnly: true,
        description: '반음 단위로 오디오 피치를 조절합니다',
        keywords: ['피치', 'pitch'],
        zones: ['files'],
    },
    {
        id: 'audio-speed', name: '오디오 배속 조절', category: '오디오', isHeavy: false, isFrontendOnly: true,
        description: '피치 유지 여부를 선택해 오디오 재생 속도를 조절합니다',
        keywords: ['배속', 'speed'],
        zones: ['files'],
    },
    {
        id: 'audio-trim', name: '오디오 자르기', category: '오디오', isHeavy: false, isFrontendOnly: true,
        description: '구간을 지정해 오디오를 자릅니다',
        keywords: ['트리밍', 'trim', '자르기'],
        zones: ['files'],
    },
    {
        id: 'audio-convert', name: '오디오 포맷 변환', category: '오디오', isHeavy: false, isFrontendOnly: true,
        description: 'mp3/wav로 오디오를 재인코딩합니다',
        keywords: ['포맷 변환', 'mp3', 'wav'],
        zones: ['files'],
    },
    {
        id: 'audio-volume', name: '오디오 음량 조절', category: '오디오', isHeavy: false, isFrontendOnly: true,
        description: '소리 크기를 자동으로 맞추거나 직접 키우고 줄입니다',
        keywords: ['볼륨', '음량', '정규화', '증폭'],
        zones: ['files'],
    },

    // 오피스 문서 변환기 (094, ADR-0029) — 백엔드 Heavy(LibreOffice+H2Orestart)로 PDF 변환,
    // 커스텀 컴포넌트가 useHeavyJob으로 직접 배선(pdf-header-footer와 동일 패턴)
    {
        id: 'office-document-convert', name: '오피스 문서 변환기', category: '문서', isHeavy: false, isFrontendOnly: true,
        description: 'HWP·HWPX·PPTX·레거시 DOC·XLS·PPT를 PDF로 변환(베타)',
        keywords: ['hwp', 'hwpx', 'ppt', 'pptx', 'doc', 'xls', '한글', '한컴', '문서 변환'],
        zones: ['files'],
    },
]
