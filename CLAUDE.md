## 에이전트 스킬

### 이슈 트래커

이슈는 `.scratch/` 아래 로컬 마크다운 파일로 관리합니다 (GitHub Issues 미사용). 외부 PR은 트리아지 대상이 아닙니다. `docs/agents/issue-tracker.md` 참조.

### 트리아지 라벨

기본 표준 라벨 문자열: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. `docs/agents/triage-labels.md` 참조.

### 도메인 문서

단일 컨텍스트 저장소: 루트에 `CONTEXT.md` 하나 + `docs/adr/`. `docs/agents/domain.md` 참조.

---

## 개발 순서

### 전제
- 설계는 `CONTEXT.md` + `docs/adr/`에 전부 확정되어 있음
- 새 기능이나 결정이 필요하면 `CONTEXT.md`를 먼저 업데이트하고 코딩
- 각 단계는 순서대로 진행 (앞 단계가 뒤 단계의 기반이 됨)
- 모듈 상세 목록은 CONTEXT.md 기능 목록 참조. 단계에서는 흐름만 표현
- **커밋 메시지 작성 규칙**: 
  - 커밋 메시지에 괄호로 된 스코프(Scope)를 넣지 마세요. (예: `feat(ui): ...` 금지. `feat: ...` 사용)
  - 커밋 메시지에 로컬 이슈 번호(예: 048)를 넣지 마세요. 깃 저장소 외부인은 의미를 알 수 없습니다.

### 단계 시작 방법 (설계가 이미 완료된 지금)

각 단계를 시작할 때는 아래 순서를 따른다:

```
1. CONTEXT.md에서 해당 단계 내용 확인
2. /to-issues 로 이슈 파일 생성  (또는 수동으로 .scratch/issues/ 에 작성)
3. /tdd 이슈파일경로  또는  /implement 이슈파일경로  로 구현
4. /code-review 로 검토 후 병합
```

**예시:**
```
/to-issues   ← CONTEXT.md 3단계 내용을 이슈로 변환해줘
/tdd .scratch/issues/003-job-entity.md
/code-review HEAD~1
```

---

### 1단계 — 프로젝트 초기 세팅

`back/` 디렉토리에 Spring Boot 프로젝트 생성.

```
back/
├── build.gradle.kts
├── settings.gradle.kts
└── src/
```

**build.gradle.kts 핵심 의존성:**
- spring-boot-starter-web
- spring-boot-starter-data-jpa
- spring-boot-starter-validation
- spring-boot-starter-security
- mysql-connector-j
- lombok
- pdfbox 2.x (openhtmltopdf 1.0.10이 pdfbox 2.x를 요구 — 실제 2.0.31)
- thumbnailator
- flexmark-all + openhtmltopdf
- springdoc-openapi-starter-webmvc-ui
- testcontainers-mysql (test)
- awaitility (test)

> 모듈별 라이브러리(ZXing, BouncyCastle, JSQLParser 등)는 해당 모듈 구현 단계에서 추가. ADR-0008 참조.

**docker-compose.yml** (루트에 생성):
- MySQL 8, DB=devtoolbox, User=devtoolbox, Password=1234, Root=root

**application.yml** (프로파일: local / prod)

완료 기준: `./gradlew build` 성공, Docker MySQL 연결 확인

---

### 2단계 — 예외 처리 인프라

가장 먼저 만드는 이유: 나머지 모든 코드에서 사용함.

```
global/exception/
  AppException.java
  ErrorCode.java            ← HTTP 상태 + 메시지 통합
  GlobalExceptionHandler.java
global/response/
  ErrorResponse.java
```

완료 기준: 존재하지 않는 URL 요청 시 ErrorResponse JSON 반환

---

### 3단계 — Job 엔티티 + Repository

큐의 핵심. 이게 없으면 Worker도 Controller도 만들 수 없음.

```
job/
  Job.java              ← @Entity, JSON 컬럼(input_paths, params), result_key, result_text
  JobRepository.java    ← findFirstByStatusWithLock (SKIP LOCKED native query)
```

완료 기준: `@DataJpaTest` + Testcontainers MySQL로 SKIP LOCKED 쿼리 테스트 통과

---

### 4단계 — ToolModule 인터페이스 계층

모듈 구현보다 인터페이스를 먼저. Worker와 Service가 이 인터페이스에 의존함.

```
tool/
  ToolModule.java           ← interface: getId, getName, getCategory, isHeavy, process
  ToolInput.java            ← record: List<Path> files, Map<String,String> params
  ToolResult.java           ← record: ofFile(Path) / ofText(String)
  ToolProcessingException.java
```

완료 기준: 컴파일 통과

---

### 5단계 — FileStorage

Worker가 결과 파일을 저장할 때 사용. Worker보다 먼저 만들어야 함.

```
global/storage/
  FileStorage.java          ← interface: save(void), getUrl, delete
  LocalFileStorage.java     ← @Profile("local"), uploads/{key} 에 저장
job/
  FileController.java       ← GET /api/v1/files/** → FileSystemResource 반환
```

완료 기준: 파일 저장 후 `GET /api/v1/files/{jobId}/result.pdf` 로 다운로드 확인

---

### 6단계 — Worker

실제로 Job을 처리하는 핵심 로직.

```
global/config/
  AsyncConfig.java          ← ThreadPoolTaskExecutor 설정
job/
  JobWorker.java            ← @Scheduled(fixedDelay=3000) + @Async processJob()
```

Worker 흐름:
```
PENDING Job 조회 (SKIP LOCKED)
→ status = RUNNING
→ ToolInput 구성 (input_paths + params)
→ module.process(input)
→ result.isFile() → fileStorage.save() → job.resultKey = key
   else           → job.resultText = result.textResult
→ status = DONE / FAILED
```

완료 기준: `@SpringBootTest` + Testcontainers + Awaitility로 PENDING→DONE 흐름 테스트 통과

---

### 7단계 — Service + Controller (기본 흐름 완성)

```
tool/
  ToolService.java          ← Map<String, ToolModule> 빈 조회·라우팅
  ToolController.java       ← GET /api/v1/modules, POST /run, POST /upload
job/
  JobService.java           ← Job 생성(단건/배치), 상태 조회, 결과 반환
  JobController.java        ← GET /api/v1/jobs/{id}, /result, /files/**
  BatchController.java      ← GET /api/v1/batches/{id}, /result(ZIP)
```

완료 기준: Postman으로 업로드 → 폴링 → 다운로드 전체 흐름 확인

---

### 8단계 — SSE

```
job/
  JobController.java        ← GET /api/v1/jobs/{id}/stream (SseEmitter) 추가
```

완료 기준: 브라우저 EventSource로 상태 변경 수신 확인

---

### 9단계 — Heavy 모듈 구현

큐·워커·SSE 흐름이 검증된 상태에서 Heavy 모듈을 카테고리별로 구현.
각 모듈은 독립적이므로 순서 무관. 테스트 파일은 `src/test/resources/samples/`에 준비.
모듈 목록 상세는 CONTEXT.md 기능 목록 참조.

```
tool/
  pdf/       ← ImageToPdf, PdfMerge, PdfSplit, MarkdownToPdf
  image/     ← ImageResize, ImageFormat, (Gif — JDK 25 호환 확인 후)
  codegen/   ← JsonSchemaToDto, OpenApiToCode
  security/  ← RsaKey, Bcrypt, VulnScan   (모듈별 라이브러리 이 단계에서 추가)
  generator/ ← QrCode, Barcode
```

완료 기준: 각 모듈 단위 테스트 (실제 파일로) 통과

---

### 10단계 — Light 모듈 구현

DB 큐 없이 `/run` 엔드포인트로 즉시 응답. 각 모듈 독립적.
모듈 목록 상세는 CONTEXT.md 기능 목록 참조.

```
tool/
  formatter/ ← SqlFormatter, XmlFormatter   (HtmlEntity는 프론트 이전 — ADR-0020)
  converter/ ← JsonYaml, JsonToml, JsonXml, CsvJson
  network/   ← HtmlFetch   (SubnetCalc·UrlParser는 프론트 이전 — ADR-0020)
  devops/    ← DockerCompose   (Cron은 프론트 이전 — ADR-0020)
  util/      ← MultiHash(구 Sha256 흡수)   (Hmac·Aes·Totp는 프론트 이전 — ADR-0020)
```

> `text/` 패키지(CaseConverter·Diff·Regex)는 전부 프론트로 이전되어 백엔드에 남아있지 않다 (ADR-0020).

> 프론트엔드 전용 모듈(JSON 포맷터, Base64, UUID 등)은 이 단계에서 프론트 작업.

완료 기준: `/run` 엔드포인트로 각 모듈 응답 확인

---

### 11단계 — 소셜 기능 (Comment · ToolStats · Suggestion)

```
comment/
  Comment.java, CommentRepository, CommentService, CommentController
  ← GET/POST /api/v1/tools/{moduleId}/comments
stats/
  ToolStats.java, ToolStatsRepository, ToolStatsService, ToolStatsController
  ← GET /api/v1/tools/{moduleId}/stats, POST /like
  ← Job 생성 시 use_count +1 (JobService에서 호출)
suggestion/
  Suggestion.java, SuggestionRepository, SuggestionService, SuggestionController
  ← POST /api/v1/suggestions
```

완료 기준: 댓글 작성·조회, 좋아요 카운트 증가, 건의사항 작성 확인

---

### 12단계 — Admin + Security + Swagger

```
global/config/
  SecurityConfig.java       ← /admin/** HTTP Basic Auth, 나머지 permitAll
admin/
  AdminController.java      ← GET /admin/stats, GET /admin/suggestions, DELETE /admin/comments/{id}
```

Swagger UI는 springdoc-openapi 자동 구성 (`/swagger-ui.html`).

완료 기준: Basic Auth로 /admin/stats 접근 확인, /swagger-ui.html 공개 확인

---

### v2 단계 — 종합 도구 포털 개편 (2026-07-17 설계 확정)

> 1~12단계(v1)는 완료. **v2 작업을 시작·재개할 때는 무조건 `.scratch/v2-plan.md`의 "실행 런북"부터 읽는다** — 진행 상태 체크리스트에서 첫 미완료 항목을 찾아 그 명령을 실행하면 된다(선행 조건 ⛔ 확인 포함). 항목 완료 시 런북 체크박스와 이슈 label을 갱신한다.

참조 문서 지도:
- 결정 요약: CONTEXT.md "v2 포털 개편" 섹션 / 근거: ADR-0023(포털 IA)·0024(인증)·0025(Flyway)·0026(페이지 카탈로그)
- 기능 확정 목록(3차의 단일 출처): `.scratch/v2-feature-list.md`
- 흐름 요약: 1차 IA(044·045·046·054) → 2차 인증(047·055①→048→049·050·051·055②) → 3차 기능 대량(052 실행→생성 이슈 순차)

각 차수 완료 시 `/code-review` → 사용자 커밋·병합(자동 커밋 금지). 인증(048)은 실브라우저 E2E 필수.

**UI 작업 규칙**: 화면을 만들거나 고치기 전에 루트 `DESIGN.md`(Workbench 토큰·구역 액센트·금지 목록)를 읽고 따른다. 리뷰 기준은 `web-design-guidelines` 스킬(Vercel WIG).

---

### 작업 진행 방식

**A. 계획된 단계 구현 (지금 상황 — 설계 완료, 단계별 구현 중)**

```
CONTEXT.md 해당 단계 확인
→ /to-issues  (또는 수동으로 이슈 작성)
→ /tdd 이슈경로  또는  /implement 이슈경로
→ /code-review → 병합
```

**B. 새 기능 추가 (설계가 불분명할 때)**

```
/grill-with-docs 기능명  ← 설계 인터뷰. CONTEXT.md 자동 업데이트
→ /to-prd               ← PRD 생성
→ /to-issues            ← 이슈로 분해
→ /tdd 이슈경로 (반복)
→ /code-review → 병합
```

**자잘한 수정:** Claude Code에 바로 요청.  
**버그:** `/diagnosing-bugs 증상설명`  
**코드가 복잡해졌을 때:** `/improve-codebase-architecture`

---

## 슬래시 명령어 사용법

### 전체 흐름

```
/grill-with-docs  →  /to-prd  →  /to-issues  →  /tdd (반복)
                                                   ↓ 버그 발생 시
                                              /diagnosing-bugs
                                                   ↓ 코드 쌓이면
                                         /improve-codebase-architecture
```

---

### `/grill-with-docs` — 설계 확정 단계에서 사용

**언제:** 새 기능을 시작하기 전, 설계가 불분명할 때

**무엇을 하나:** Claude가 질문을 던지며 인터뷰한다. 대답하다 보면 설계가 구체화되고, ADR과 CONTEXT.md가 자동으로 업데이트된다.

**사용법:** 뒤에 어떤 기능을 설계할지 써준다. 안 쓰면 뭘 설계할지 모름.
```
/grill-with-docs 배치 ZIP 다운로드 기능 추가하려고 한다
```
그 다음 Claude가 질문하면 답하면 된다. 설계가 충분히 뾰족해지면 종료.

**이 프로젝트에서의 상태:** 초기 설계 완료. 새 기능 추가 시 다시 사용.

---

### `/to-prd` — 설계를 PRD 문서로 변환

**언제:** `/grill-with-docs`가 끝난 직후

**무엇을 하나:** 현재 대화 컨텍스트와 CONTEXT.md를 읽어서 PRD(기획서)를 `.scratch/` 폴더에 자동 생성한다. 인터뷰 없이 바로 합성한다.

**사용법:** 그냥 치면 된다. 알아서 컨텍스트를 읽음.
```
/to-prd
```
PRD가 생성되면 내용을 확인하고 틀린 부분만 수정한다.

---

### `/to-issues` — PRD를 이슈로 쪼개기

**언제:** PRD가 만들어진 직후

**무엇을 하나:** PRD를 읽고 독립적으로 구현 가능한 이슈들로 분해해서 `.scratch/` 폴더에 저장한다. 각 이슈는 수직 슬라이스(기능 하나의 전체 구현)다.

**사용법:** 그냥 치면 된다. 알아서 PRD를 읽음.
```
/to-issues
```
이슈 목록이 나오면 순서와 내용을 확인한다.

---

### `/tdd` — 이슈를 TDD로 구현

**언제:** 이슈 하나를 구현할 때마다

**무엇을 하나:** red → green → refactor 루프로 구현한다. 테스트를 먼저 작성하고, 테스트를 통과시키는 코드를 작성한다.

**사용법:** 뒤에 이슈 파일 경로를 써준다. 안 쓰면 뭘 구현할지 모름.
```
/tdd .scratch/issues/001-job-entity.md 진행해
```

**여러 이슈 한번에 (AFK 방식):** 자리를 비워도 Claude가 알아서 전부 처리한다.
```
AFK 이슈들 전부 /tdd 진행해, PR 만들고 병합까지 해줘
```

**테스트를 green으로 만들고 끝내지 않는다.** green이 된 직후, 방금 쓴 assertion이 "코드가 방금 짠 대로 정확히 동작할 때만" 통과하는지, 아니면 "코드가 그럴듯하게 잘못 짜여 있어도" 통과하는지 한 번 자문한다. 아래 두 패턴에 걸리는지 확인 — 걸리면 assertion을 보강한다.

- **패턴 A — 구조/개수/존재만 확인, 내용은 확인 안 함.** ZIP 엔트리 개수만 세고 내용은 안 읽는다, 파일이 존재하고 크기>0인 것만 본다, 인코더(QR·바코드) 출력만 검증하고 디코드해서 원본과 비교하지 않는다. → 실제 바이트/텍스트 내용을 독립적인 기준값과 비교하도록 보강한다.
- **패턴 B — 행위자/시나리오가 하나뿐이라 "좁게 맞는 것"과 "넓게 잘못된 것"을 구분 못함.** row가 하나뿐이라 "만료된 것만 삭제"와 "전부 삭제"를 구분 못한다, 스레드 하나만 확인해서 "올바른 배타 락"과 "아무도 못 가져감"을 구분 못한다. → 최소 2개의 행위자/시나리오(하나는 조건에 맞고 하나는 안 맞게)를 두고, 조건에 안 맞는 쪽이 살아남는지/영향받지 않는지도 assert한다.

라운드트립 테스트(`encrypt→decrypt==원본` 등)는 별도로: 중간 값(암호문)이 원본과 실제로 달라졌는지도 assert한다 — 안 그러면 아무 일도 안 하는 구현이 통과한다.

이 점검은 `/code-review`의 Standards 축에서도 동일하게 적용한다 — smell baseline과 별개로, 새로 추가된 테스트 파일이 있으면 이 두 패턴에 걸리는지 확인 대상에 포함한다.

---

### `/diagnosing-bugs` — 버그 진단

**언제:** 테스트가 통과했는데 실제 동작이 이상할 때, 원인을 모를 때

**무엇을 하나:** 버그를 체계적으로 추적한다. 재현 조건 → 가설 → 검증 순서로 좁혀간다.

**사용법:** 뒤에 어떤 버그인지 설명한다. 안 쓰면 뭘 진단할지 모름.
```
/diagnosing-bugs Worker가 Job을 RUNNING으로 바꾸는데 DONE으로 안 바뀐다
```

---

### `/improve-codebase-architecture` — 아키텍처 개선

**언제:** 기능 구현이 어느 정도 완성된 후, 코드 품질을 높이고 싶을 때

**무엇을 하나:** 코드 전체를 스캔해서 개선 기회를 HTML 리포트로 보여준다. 선택하면 그 부분을 리팩토링한다.

**사용법:** 그냥 치면 된다. 알아서 코드베이스를 스캔함.
```
/improve-codebase-architecture
```
리포트를 보고 개선할 항목을 선택하면 Claude가 진행한다.

---

### `/code-review` — 코드 리뷰

**언제:** 구현이 끝나고 PR 올리기 전, 또는 브랜치 작업 후 검토할 때

**무엇을 하나:** 기준점(커밋, 브랜치, 태그) 이후의 변경사항을 두 축으로 리뷰한다. ① 코딩 표준 준수 여부, ② 이슈/PRD 명세와 일치 여부. 두 리뷰를 병렬로 실행해서 나란히 보여준다.

**사용법:** 뒤에 어디서부터 리뷰할지 기준점을 써준다.
```
/code-review main 브랜치 이후 변경사항 리뷰해줘
/code-review 005 태그 이후 리뷰해줘
```

---

### `/implement` — 테스트 없이 구현

**언제:** TDD 없이 빠르게 구현만 하고 싶을 때

**무엇을 하나:** PRD나 이슈를 읽고 바로 코드를 작성한다. `/tdd`와 달리 테스트를 먼저 쓰지 않음.

**사용법:** 뒤에 이슈 파일 경로나 구현할 내용을 써준다.
```
/implement .scratch/issues/001-job-entity.md
```

---

### `/research` — 기술 조사

**언제:** 모르는 라이브러리, API, 개념을 조사해야 할 때

**무엇을 하나:** 질문을 받아 공식 문서 등 신뢰할 수 있는 출처를 조사하고 결과를 Markdown 파일로 저장한다.

**사용법:** 뒤에 조사할 내용을 써준다.
```
/research PDFBox 2.x로 PDF 분할하는 방법
/research Testcontainers MySQL 8 설정 방법
```

---

### `/handoff` — 세션 인계

**언제:** 대화가 너무 길어져서 컨텍스트가 꽉 찼을 때, 다음 대화에서 이어서 작업하고 싶을 때

**무엇을 하나:** 현재까지의 대화를 요약해서 다음 세션이 바로 이어받을 수 있는 인계 문서를 만든다.

**사용법:** 뒤에 다음 세션에서 뭘 할지 써준다.
```
/handoff Worker 구현 이어서 할 예정
```

---

### `/teach` — 모르는 개념 배우기

**언제:** 라이브러리, 개념, 기술을 모를 때

**무엇을 하나:** 주제를 가르쳐준다. 레슨 HTML 파일을 만들고 학습 기록을 유지해서 다음 세션에도 이어서 배울 수 있다.

**사용법:** 뒤에 배우고 싶은 내용을 써준다.
```
/teach PDFBox로 PDF 조작하는 방법
/teach Spring @Async 동작 원리
```

---

### `/triage` — 이슈 상태 정리

**언제:** `.scratch/`에 이슈가 쌓였을 때, 어떤 이슈부터 해야 할지 정리하고 싶을 때

**무엇을 하나:** 이슈를 상태 머신으로 관리한다. `needs-triage` → 분류 → `ready-for-agent` 순서로 이슈를 정리하고, 에이전트가 바로 실행할 수 있는 형태로 만든다.

**사용법:** 그냥 치면 된다. 알아서 이슈 목록을 읽음.
```
/triage
```

---

### `/ask-matt` — 어떤 명령어를 써야 할지 모를 때

**언제:** 지금 상황에 어떤 명령어가 맞는지 헷갈릴 때

**무엇을 하나:** 상황을 설명하면 어떤 명령어를 써야 하는지 알려준다.

**사용법:** 뒤에 현재 상황을 설명한다.
```
/ask-matt 이슈가 있는데 TDD로 해야 할지 그냥 구현해야 할지 모르겠다
```

---

### 명령어 선택 기준 요약

| 상황                             | 명령어                              |
|--------------------------------|----------------------------------|
| 새 기능 시작 전 설계가 불분명하다            | `/grill-with-docs 기능명`           |
| 설계가 끝났고 기획서를 만들어야 한다           | `/to-prd`                        |
| 기획서를 이슈로 쪼개야 한다                | `/to-issues`                     |
| 이슈를 TDD로 구현해야 한다               | `/tdd 이슈파일경로`                    |
| 자리 비운 사이 이슈 여러 개를 자동으로 처리하고 싶다 | AFK — 아래 참고                      |
| 이슈를 빠르게 구현만 하고 싶다              | `/implement 이슈파일경로`              |
| 버그가 생겼다                        | `/diagnosing-bugs 증상설명`          |
| 코드가 복잡해졌다                      | `/improve-codebase-architecture` |
| PR 올리기 전 리뷰가 필요하다              | `/code-review 기준점`               |
| 모르는 기술을 조사해야 한다                | `/research 조사내용`                 |
| 이슈 상태를 정리하고 싶다                 | `/triage`                        |
| 모르는 개념을 배우고 싶다                 | `/teach 주제`                      |
| 대화가 너무 길어졌다                    | `/handoff 다음할일`                  |
| 어떤 명령어를 써야 할지 모르겠다             | `/ask-matt 상황설명`                 |

### AFK 자동 실행

슬래시 명령어가 아닌 자연어로 Claude에게 파이프라인을 지시한다. Claude가 순서대로 알아서 처리한다.

```
# 이슈 하나 — TDD + 리뷰
AFK .scratch/issues/002-xxx.md /tdd 진행하고, 완료되면 /code-review 해줘

# 이슈 여러 개 한번에
AFK .scratch/issues/ 전부 /tdd 진행해, 각각 /code-review 해줘

# 이슈 생성부터 리뷰까지
AFK 3단계 /to-issues 만들고 /tdd + /code-review 까지 해줘
```

완료되면 Claude가 커밋 메시지를 추천한다. 커밋은 직접 한다.  
문제가 발견되면 Claude가 멈추고 보고한다.

---

## 🤖 프론트엔드 ↔ 백엔드 AI 간 비동기 협업 프로토콜

현재 백엔드는 **Claude**(IntelliJ), 프론트엔드는 **Antigravity**(VSCode)가 담당하고 있으며, 두 AI 간의 직접적인 P2P 통신은 불가능합니다. 

따라서 두 AI가 협업할 때는 **파일을 신호(Signal)로 사용하는 비동기 통신**을 해야 합니다.

1. **소통 창구:** `docs/AI_SYNC.md` 파일을 메시지 보드로 사용합니다.
2. **백엔드(Claude)의 역할:** API 스펙 확정, 에러 코드 정책 변경 등 프론트엔드가 알아야 할 사항이 생기면 `docs/AI_SYNC.md`에 내용을 작성하고 커밋합니다.
3. **사용자의 역할:** Claude가 문서를 작성하면, 사용자님께서 Antigravity에게 "문서 업데이트됨" 이라고 한마디만 전달해 주시면 됩니다.
4. **API 스펙 우선주의:** 소셜 로그인 등 강결합된 기능은 Claude가 먼저 스펙을 정의하고 문서를 남긴 뒤에, Antigravity가 이를 보고 프론트 UI를 구현하는 순서로 안전하게 진행합니다.
