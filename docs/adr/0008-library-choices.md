# ADR-0008 모듈별 라이브러리 선택

## 상태
업데이트 (2026-07-05: 모듈 30+로 확장에 따른 라이브러리 추가 / 2026-07-14: 마크다운→PDF 한글 폰트 리소스 추가 / 2026-07-15: 실제 `build.gradle.kts`와 정합화 — PDFBox 2.x·toml4j·java-otp 반영, GIF·QR/바코드 상태 갱신 / 2026-07-15: HMAC·AES·TOTP·Cron·Diff·Regex를 프론트로 이전하고 백엔드 모듈·의존성(java-otp·cron-utils·java-diff-utils) 제거 — ADR-0020)

## 결정

### Heavy 모듈 (파일 처리)

| 모듈                 | 라이브러리                                                                                                                                                   | 라이선스           |
|--------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------|----------------|
| 이미지→PDF, PDF 병합·분할 | Apache PDFBox 2.0.31 (openhtmltopdf 1.0.10이 pdfbox 2.x를 요구)                                                                                             | Apache 2.0     |
| 이미지 리사이즈·포맷 변환     | Thumbnailator                                                                                                                                           | MIT            |
| 마크다운→PDF           | flexmark-all + openhtmltopdf                                                                                                                            | BSD / LGPL 2.1 |
| 마크다운→PDF 한글 렌더링    | `Pretendard-Regular.ttf`(`back/src/main/resources/fonts/`, 프론트 npm 패키지에서 복사) — openhtmltopdf는 시스템 폰트를 쓰지 않아 `PdfRendererBuilder.useFont(...)`로 명시 등록 필요 | OFL-1.1        |
| GIF 생성 (Heavy)     | JDK ImageIO(내장, 애니메이션 GIF 메타데이터) + Thumbnailator — 구현 완료                                                                                                | —              |
| ZIP·TAR 아카이브       | java.util.zip (내장) / Apache Commons Compress                                                                                                            | — / Apache 2.0 |

### Heavy 모듈 (코드 생성)

| 모듈                    | 라이브러리             | 라이선스       |
|-----------------------|-------------------|------------|
| JSON Schema→Java POJO | jsonschema2pojo   | Apache 2.0 |
| OpenAPI→코드 스텁         | openapi-generator | Apache 2.0 |

### Light 모듈 (포맷터)

| 모듈                        | 라이브러리                                                                     | 라이선스       |
|---------------------------|---------------------------------------------------------------------------|------------|
| SQL 포맷터                   | JSQLParser                                                                | Apache 2.0 |
| XML 포맷터/미니파이어             | JDK javax.xml (내장)                                                        | —          |
| HTML Entity 인코더/디코더       | 프론트 로컬(`he`, `front/src/utils/htmlEntity.ts`) — 백엔드 불요 (ADR-0020)         | MIT        |
| JSON→YAML / XML / TOML 변환 | jackson-dataformat-yaml, jackson-dataformat-xml, toml4j(com.moandjiezana) | Apache 2.0 |
| CSV 파싱·변환                 | commons-csv                                                               | Apache 2.0 |

### Light 모듈 (보안/암호화)

| 모듈                           | 라이브러리                                                                         | 라이선스       |
|------------------------------|-------------------------------------------------------------------------------|------------|
| RSA 키 생성                     | JDK KeyPairGenerator + Bouncy Castle (bcprov-jdk18on)                         | MIT        |
| 비밀번호 해시 (BCrypt)             | spring-security-crypto                                                        | Apache 2.0 |
| 다중 해시 (MD5·SHA·SHA3·BLAKE2b) | JDK MessageDigest(내장) + Bouncy Castle                                         | —          |
| AES 암호화/복호화                  | 프론트 로컬(Web Crypto, `front/src/utils/aes.ts`) — 백엔드 불요 (ADR-0020)              | —          |
| HMAC 생성                      | 프론트 로컬(Web Crypto + spark-md5, `front/src/utils/hmac.ts`) — 백엔드 불요 (ADR-0020) | MIT        |
| TOTP 코드 생성                   | 프론트 로컬(Web Crypto, `front/src/utils/totp.ts`) — 백엔드 불요 (ADR-0020)             | —          |
| JWT 디코더                      | 프론트 로컬(base64 디코드, `front/src/utils/jwtAnalysis.ts`) — 백엔드 불요                 | —          |

### Light 모듈 (개발 유틸)

| 모듈             | 라이브러리                                               | 라이선스 |
|----------------|-----------------------------------------------------|------|
| Regex 테스터      | 프론트 로컬(브라우저 RegExp) — 백엔드 불요 (ADR-0020)             | —    |
| Diff 생성        | 프론트 로컬(npm `diff`) — 백엔드 불요 (ADR-0020)              | —    |
| Cron 표현식 검증·설명 | 프론트 로컬(cronstrue + cron-parser) — 백엔드 불요 (ADR-0020) | MIT  |
| UUID·난수 생성     | 프론트 로컬(crypto.randomUUID)                           | —    |

### Light 모듈 (QR/바코드)

| 모듈           | 라이브러리                 | 라이선스       |
|--------------|-----------------------|------------|
| QR 코드·바코드 생성 | ZXing (core + javase) | Apache 2.0 |

### 공통 인프라

| 용도     | 라이브러리                               | 라이선스       |
|--------|-------------------------------------|------------|
| API 문서 | springdoc-openapi-starter-webmvc-ui | Apache 2.0 |
| 관리자 인증 | spring-boot-starter-security        | Apache 2.0 |

## 제외된 라이브러리와 이유

**iText**: AGPL 라이선스. 상업적 사용 시 소스코드 공개 의무.

**GIF (AnimatedGifEncoder)**: 2005년대 코드, 유지보수 없음. JDK 25 호환성 불확실. 구현 시점에 재검토.

**WebP (webp-imageio)**: JNI 네이티브 바인딩(libwebp) 사용. Oracle Cloud 배포 환경(ARM64 Linux)에서 `UnsatisfiedLinkError` 발생 가능.

**Apache Commons Compress (ZIP 전용)**: java.util.zip 내장으로 충분. TAR 지원 필요 시에만 추가.

## 라이브러리 선택 기준

1. **순수 Java 구현** — JNI/네이티브 바인딩 제외. ARM64 배포 환경 호환성 보장
2. **Apache 2.0 또는 MIT** — 라이선스 리스크 없음
3. **세부 버전** — 구현 시점에 JDK 25 호환성 확인 후 확정
