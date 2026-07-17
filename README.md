# DevToolbox

**개발자가 자주 쓰는 도구를 한 곳에 모은 허브.**  
공통 인터페이스 하나로 30개 이상의 도구를 관리한다. 새 도구는 클래스 하나만 추가하면 자동 등록된다.

> 백엔드 데브코스 10기 12회차 — 데브코스 프로덕트 챌린지 프로젝트

> **v2 개편 진행 중 (2026-07)**: 개발자 도구를 넘어 파일·문서 / 생활 도구 / 재미·게임까지 아우르는 **종합 도구 포털**로 확장 중이다. 랜딩 대문 + 4구역 구조, 소셜 로그인(구글·카카오, JWT), Flyway 기반 스키마 관리가 추가된다. 설계는 `CONTEXT.md`의 "v2 포털 개편" 섹션과 ADR-0023~0026 참조.

![DevToolbox 미리보기](docs/preview.png)

---

## 동작 방식

도구는 두 종류로 나뉜다.

- **Heavy** — 이미지→PDF, PDF 병합, 마크다운→PDF 같은 파일 처리형 도구. 파일을 업로드하면 처리가 끝날 때까지 시간이 걸리므로, 요청은 즉시 작업 ID만 돌려받고 완료되면 알림(SSE)으로 통보받아 결과를 다운로드한다.
- **Light** — JSON 포맷터, Base64 인코딩처럼 텍스트를 입력하면 그 자리에서 바로 결과가 나오는 도구. 업로드나 대기 없이 버튼을 누르는 즉시 결과가 뜬다.

PDF 변환처럼 수 초가 걸리는 작업과 JSON 포맷터처럼 즉석에서 끝나는 작업이 같은 인터페이스 아래 공존한다. 이를 가능하게 하는 건 `ToolModule` 인터페이스다.

```java
public interface ToolModule {
    String getId();
    String getName();
    String getCategory();
    boolean isHeavy();      // 처리 경로를 결정하는 유일한 분기점
    ToolResult process(ToolInput input) throws ToolProcessingException;
}
```

새 도구는 이 인터페이스를 구현하는 `@Component` 클래스 하나만 추가하면 된다. Spring이 자동으로 감지해 등록하고, `isHeavy()` 값에 따라 처리 경로가 결정된다.

```
isHeavy() = true  → Job DB 등록 → 작업 ID 즉시 반환
                    ↓ 워커 백그라운드 처리
                    클라이언트: 폴링 or SSE로 완료 감지 → 결과 다운로드

isHeavy() = false → 즉시 처리 → 바로 응답
```

---

## 제공 도구 (8개 카테고리, 34개)

### PDF (4, Heavy)
- **이미지 → PDF** — 이미지를 하나의 PDF로 묶기
- **마크다운 → PDF** — Markdown 문서를 PDF로 변환
- **PDF 병합** — 여러 PDF를 하나로 병합
- **PDF 분할** — PDF를 페이지 단위로 분할

### 이미지 (3, Heavy)
- **이미지 리사이즈** — 이미지 크기 및 해상도 조정 (업스케일 시 품질 저하 경고 포함)
- **이미지 포맷 변환** — PNG, JPG, WebP 등 포맷 변환
- **GIF 생성** — 이미지 시퀀스를 GIF로 변환

### 생성기 (4, Heavy/Light)
- **JSON Schema → DTO** — JSON Schema로 Java DTO 클래스 생성 (Heavy)
- **OpenAPI → 코드 생성** — OpenAPI 스펙으로 클라이언트 코드 생성 (Heavy)
- **UUID 생성기** — UUID v4 무작위 생성 (Light)
- **코드 생성기** — QR·바코드 생성 (Light)

### 보안·암호화 (7, Heavy/Light)
- **Bcrypt 해시** — 비밀번호 Bcrypt 해시 생성 및 검증
- **RSA/EC 키쌍 생성** — RSA 공개키/개인키 쌍 생성
- **의존성 취약점 스캔** — 의존성 파일(Gradle/Maven) CVE 취약점 검사 (Heavy)
- **AES 암호화/복호화** — AES-256 CBC 암호화/복호화
- **HMAC 서명** — HMAC-SHA256/SHA512 서명 생성
- **다중 해시** — MD5·SHA-1·SHA-256·SHA-512 동시 생성
- **TOTP 생성** — TOTP 일회용 코드 생성 (RFC 6238)

### 포맷터 (8, Light)
- **SQL 포맷터** — SQL 쿼리 정렬 및 포맷
- **XML 포맷터** — XML 문서 들여쓰기 정렬
- **JSON 포맷터** — JSON 정렬 및 미니파이
- **JWT 디코더** — JWT 토큰 Header·Payload 파싱
- **타임스탬프** — Unix timestamp ↔ 날짜/시간 변환
- **색상 코드** — HEX ↔ RGB ↔ HSL 변환
- **인코더/디코더** — Base64·URL·HTML Entity 인코딩/디코딩
- **데이터 포맷 변환** — JSON·YAML·TOML·XML·CSV 상호 변환

### 텍스트 (3, Light)
- **Diff 비교** — 두 텍스트 차이 시각화
- **Regex 테스터** — 정규표현식 실시간 테스트
- **텍스트 유틸** — 케이스 변환·글자 수·한영 변환·공백 정규화

### 네트워크 (3, Light)
- **HTML 소스 가져오기** — URL에서 HTML 소스 가져오기
- **서브넷 계산기** — IP 서브넷 마스크 계산
- **URL 파서** — URL 구성 요소 분해 및 파싱

### DevOps (2, Light)
- **Cron 표현식 파서** — Cron 표현식 파싱 및 다음 실행 시각
- **docker run → Compose 변환** — docker run 명령어 → docker-compose.yml 변환

---

## 서비스 기능

**댓글**  
각 도구 페이지에 익명으로 피드백을 남길 수 있다. 로그인 불필요. 관리자는 `/admin/comments/{id}`로 삭제 가능.

**사용 통계 · 좋아요**  
도구별 사용 횟수와 좋아요 수를 집계한다. 좋아요는 localStorage로 중복 방지. 통계는 `GET /api/v1/tools/{moduleId}/stats`로 조회.

**건의사항**  
새 도구 요청이나 개선 의견을 남길 수 있다. 관리자 페이지에서 목록 조회 가능.

**관리자 페이지**  
`/admin/stats` — 전체 통계 조회. `/admin/suggestions` — 건의사항 목록. HTTP Basic Auth 보호.

---

## Heavy 처리 구조

외부 인프라(Redis, RabbitMQ 등) 없이 MySQL만으로 분산 큐를 구현했다.

- **DB 기반 큐**: `Job` 테이블의 `PENDING` 상태가 큐 역할. `SELECT FOR UPDATE SKIP LOCKED`로 다중 워커가 동일 Job을 중복 처리하지 않도록 보장
- **비동기 워커**: `@Scheduled` + `@Async` + `ThreadPoolTaskExecutor`. PENDING Job을 꺼내 `process()` 호출
- **결과 분기**: 파일 결과 → `FileStorage` 인터페이스로 저장 (개발·운영 모두 로컬 디스크, 운영은 Docker 볼륨). 텍스트 결과 → Job 레코드에 직접 저장
- **SSE 알림**: `SseEmitter`로 Job 상태 변경을 클라이언트에 실시간 푸시
- **배치**: 파일 N개 → Job N개 생성. `batch_id`로 묶어 진행률 집계

---

## DB 스키마

Heavy 도구의 처리 단위인 `Job` 테이블이 큐의 핵심이다.

| 컬럼            | 타입           | 설명                                               |
|---------------|--------------|--------------------------------------------------|
| `id`          | VARCHAR(36)  | 작업 ID (UUID)                                     |
| `module_id`   | VARCHAR(50)  | 도구 식별자 (예: `"image-to-pdf"`)                     |
| `batch_id`    | VARCHAR(36)  | 배치 그룹 키. 단건이면 null                               |
| `status`      | VARCHAR(10)  | `PENDING` → `RUNNING` → `DONE` / `FAILED`        |
| `input_paths` | JSON         | 입력 파일 경로 배열. 순서 보존                               |
| `params`      | JSON         | 모듈 옵션. 예: `{"width":"800","height":"600"}`       |
| `result_key`  | VARCHAR(255) | 파일 결과 식별자. `FileStorage.getUrl(key)`로 URL 생성     |
| `result_text` | TEXT         | 텍스트 결과 (해시값, CVE 목록 등). `result_key`와 둘 중 하나만 사용 |
| `created_at`  | DATETIME     | 생성 시각                                            |
| `expires_at`  | DATETIME     | TTL 만료 시각. 만료 시 파일 자동 삭제                         |

---

## 기술 스택

| 영역       | 기술                                                                           |
|----------|------------------------------------------------------------------------------|
| 백엔드      | Spring Boot 4.1.0, JDK 25, Gradle Kotlin DSL, Spring Security                |
| 데이터      | MySQL 8, JPA                                                                 |
| 주요 라이브러리 | PDFBox, Thumbnailator, flexmark+openhtmltopdf, ZXing, Bouncy Castle, Jackson |
| 테스트      | JUnit 5, Testcontainers, Awaitility                                          |
| 프론트엔드    | Vue 3, Vite                                                                  |
| 인프라      | Docker Compose, Oracle Cloud Always Free, Vercel, nginx (리버스 프록시 + TLS)      |
| API 문서   | Swagger UI (springdoc-openapi)                                               |

---

## 프로젝트 구조

```
DevToolbox/
├── back/                        # Spring Boot 백엔드
│   └── src/main/java/com/back/
│       ├── global/
│       │   ├── config/          # AsyncConfig, SecurityConfig, WebMvcConfig
│       │   ├── exception/       # AppException, ErrorCode, GlobalExceptionHandler
│       │   ├── ratelimit/        # RateLimiter, ClientIpResolver — IP 기반 rate limiting
│       │   ├── response/        # ErrorResponse
│       │   ├── storage/         # FileStorage 인터페이스, LocalFileStorage, OrphanFileSweeper
│       │   └── util/            # 공통 유틸
│       ├── tool/                # 도구 플랫폼(model·service·controller·dto) + 카테고리별 구현체 23개
│       │   ├── pdf/  image/  codegen/  security/  util/
│       │   └── generator/  formatter/  converter/  network/  devops/
│       ├── job/                 # Job 엔티티·Worker·스케줄러·배치 (entity·repository·service·controller·dto)
│       ├── comment/
│       ├── stats/
│       ├── suggestion/
│       └── admin/
├── front/                       # Vue 3 프론트엔드
└── docker-compose.yml           # MySQL 로컬 환경
```

---

## 로컬 실행

**요구사항:** JDK 25, Docker

```bash
# MySQL 실행
docker compose up -d

# 백엔드
cd back
./gradlew bootRun --args='--spring.profiles.active=local'

# 프론트엔드
cd front
pnpm install && pnpm dev
```

| 서비스    | URL                                     |
|--------|-----------------------------------------|
| 백엔드    | `http://localhost:8080`                 |
| 프론트엔드  | `http://localhost:5173`                 |
| API 문서 | `http://localhost:8080/swagger-ui.html` |

---

## 환경변수

**로컬 (`application-local.yaml`):**  
MySQL은 `docker compose up -d`로 실행. 관리자 계정은 yml에 직접 작성한다.

```yaml
spring:
  security:
    user:
      name: admin
      password: 1234
```

**운영 (`application-prod.yaml`):**  
비밀번호를 코드에 하드코딩하지 않고 환경변수로 주입한다. 배포는 `.github/workflows/deploy.yml`이
아래 **GitHub Secrets**를 읽어 OCI VM에 `.env`를 생성하고 `docker-compose.prod.yml`을 띄운다.
(로컬·리포지토리에 `.env` 파일을 두지 않으므로 별도 `.env.example`은 관리하지 않는다.)

리포지토리 Settings → Secrets and variables → Actions 에 등록:

| Secret             | 설명                         |
|--------------------|----------------------------|
| `OCI_HOST`         | 배포 대상 VM 호스트/IP            |
| `OCI_SSH_KEY`      | VM 접속용 SSH 개인키             |
| `GHCR_TOKEN`       | GHCR 이미지 pull용 토큰          |
| `DB_USERNAME`      | MySQL 사용자명                 |
| `DB_PASSWORD`      | MySQL 사용자 비밀번호             |
| `DB_ROOT_PASSWORD` | MySQL root 비밀번호            |
| `ADMIN_USERNAME`   | 관리자 HTTP Basic Auth 사용자명   |
| `ADMIN_PASSWORD`   | 관리자 HTTP Basic Auth 비밀번호   |
| `CORS_ORIGIN`      | 허용할 프론트엔드 도메인 (Vercel URL) |
| `STORAGE_BASE_URL` | 파일 다운로드 링크 생성용 백엔드 공개 URL  |
