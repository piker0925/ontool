# DevToolbox

> 백엔드 데브코스 10기 12회차 — 데브코스 프로덕트 챌린지 프로젝트

**개발자가 자주 쓰는 도구를 한 곳에 모은 허브.**  
공통 인터페이스 하나로 30개 이상의 도구를 관리한다. 새 도구는 클래스 하나만 추가하면 자동 등록된다.

---

## 동작 방식

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

## 제공 도구 (10개 카테고리, 30개+)

| 카테고리 | 주요 도구 | 처리 방식 |
|----------|-----------|-----------|
| **PDF** | 이미지→PDF, PDF 병합·분할, 마크다운→PDF | Heavy |
| **이미지** | 리사이즈, 포맷 변환, GIF 생성 | Heavy |
| **코드 생성** | JSON Schema→DTO, OpenAPI→클라이언트 코드 | Heavy |
| **보안** | RSA/EC 키쌍, BCrypt·AES·HMAC, TOTP, 멀티해시, 취약점 스캔 | Heavy / Light |
| **생성기** | QR코드, 바코드, UUID | Heavy / Light |
| **포맷터** | JSON·SQL·XML 포맷터, HTML Entity 인코딩 | Light |
| **변환기** | JSON↔YAML·TOML·XML, CSV↔JSON | Light |
| **텍스트** | 케이스 변환, Diff, Regex 테스터, 글자수 세기, 공백 정규화 | Light |
| **네트워크** | 서브넷 계산기, URL 파서, HTML 소스보기 | Light |
| **DevOps** | Cron 파서·빌더, docker run→compose 변환 | Light |

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
- **결과 분기**: 파일 결과 → `FileStorage` 인터페이스로 저장 (개발: 로컬 디스크, 운영: Cloudinary CDN). 텍스트 결과 → Job 레코드에 직접 저장
- **SSE 알림**: `SseEmitter`로 Job 상태 변경을 클라이언트에 실시간 푸시
- **배치**: 파일 N개 → Job N개 생성. `batch_id`로 묶어 진행률 집계

---

## DB 스키마

Heavy 도구의 처리 단위인 `Job` 테이블이 큐의 핵심이다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | VARCHAR(36) | 작업 ID (UUID) |
| `module_id` | VARCHAR(50) | 도구 식별자 (예: `"image-to-pdf"`) |
| `batch_id` | VARCHAR(36) | 배치 그룹 키. 단건이면 null |
| `status` | VARCHAR(10) | `PENDING` → `RUNNING` → `DONE` / `FAILED` |
| `input_paths` | JSON | 입력 파일 경로 배열. 순서 보존 |
| `params` | JSON | 모듈 옵션. 예: `{"width":"800","height":"600"}` |
| `result_key` | VARCHAR(255) | 파일 결과 식별자. `FileStorage.getUrl(key)`로 URL 생성 |
| `result_text` | TEXT | 텍스트 결과 (해시값, CVE 목록 등). `result_key`와 둘 중 하나만 사용 |
| `created_at` | DATETIME | 생성 시각 |
| `expires_at` | DATETIME | TTL 만료 시각. 만료 시 파일 자동 삭제 |

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| 백엔드 | Spring Boot 4.0.6, JDK 25, Gradle Kotlin DSL, Spring Security |
| 데이터 | MySQL 8, JPA |
| 주요 라이브러리 | PDFBox, Thumbnailator, flexmark+openhtmltopdf, ZXing, Bouncy Castle, Jackson |
| 테스트 | JUnit 5, Testcontainers, Awaitility |
| 프론트엔드 | Vue 3, Vite |
| 인프라 | Docker Compose, Oracle Cloud Always Free, Vercel, Cloudinary |
| API 문서 | Swagger UI (springdoc-openapi) |

---

## 프로젝트 구조

```
DevToolbox/
├── back/                        # Spring Boot 백엔드
│   └── src/main/java/com/back/
│       ├── global/
│       │   ├── config/          # AsyncConfig, SecurityConfig, WebMvcConfig
│       │   ├── exception/       # AppException, ErrorCode, GlobalExceptionHandler
│       │   ├── response/        # ErrorResponse
│       │   └── storage/         # FileStorage 인터페이스, LocalFileStorage, CloudinaryFileStorage
│       └── domain/
│           ├── tool/            # ToolModule 인터페이스 + 30개 구현체
│           │   ├── pdf/
│           │   ├── image/
│           │   ├── codegen/
│           │   ├── security/
│           │   ├── generator/
│           │   ├── formatter/
│           │   ├── converter/
│           │   ├── text/
│           │   ├── network/
│           │   ├── devops/
│           │   └── util/
│           ├── job/             # Job 엔티티, Worker, 배치
│           ├── comment/
│           ├── stats/
│           ├── suggestion/
│           └── admin/
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

| 서비스 | URL |
|---|---|
| 백엔드 | `http://localhost:8080` |
| 프론트엔드 | `http://localhost:5173` |
| API 문서 | `http://localhost:8080/swagger-ui.html` |

---

## 환경변수

**로컬 (`application-local.yml`):**  
MySQL은 `docker compose up -d`로 실행. 관리자 계정은 yml에 직접 작성한다.

```yaml
spring:
  security:
    user:
      name: admin
      password: devpassword
```

**운영 (`application-prod.yml`):**  
비밀번호를 코드에 하드코딩하지 않고 환경변수로 주입한다.

| 변수 | 설명 |
|------|------|
| `ADMIN_PASSWORD` | 관리자 HTTP Basic Auth 비밀번호 |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary 클라우드 이름 |
| `CLOUDINARY_API_KEY` | Cloudinary API 키 |
| `CLOUDINARY_API_SECRET` | Cloudinary API 시크릿 |
