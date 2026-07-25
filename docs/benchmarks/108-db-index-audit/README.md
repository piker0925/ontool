# DB 인덱스·캐싱 감사 (108)

전체 Repository의 `findBy*`/`@Query` 파생 쿼리를 전수 조사해 WHERE/ORDER BY 컬럼에 인덱스가 있는지
대조하고, 누락된 인덱스를 Flyway `V9__index_audit.sql`로 추가했다. 근거는 이론이 아니라 실측 —
`back/src/test/java/com/back/migration/IndexUsageAuditTest.java`가 V9까지 적용한 실제 MySQL에
수만 행을 시딩하고 `EXPLAIN`으로 옵티마이저가 실제로 그 인덱스를 고르는지 확인한다.

이 문서는 109(N+1 감사)와 범위가 겹치지 않는다 — 여기는 "컬럼에 인덱스가 있는가", 109는 "루프
안에서 연관 엔티티를 개별 조회하는가"를 다룬다. 코드 변경도 서로 건드리지 않는다.

## 인덱스 감사표

### job (`JobRepository`)

| 메서드 | WHERE/ORDER BY | V9 이전 인덱스 | 조치 |
|---|---|---|---|
| `findFirstPendingWithLock` | `status='PENDING' ORDER BY created_at` | 없음 | 프로덕션 코드에서 호출되지 않는 죽은 메서드(테스트 전용) — `idx_job_status_created_at`의 접두사로 부수적으로 커버됨, 별도 조치 없음 |
| `findPendingBatchByLane` | `status=? AND lane=? ORDER BY created_at` | 없음 | **추가** `idx_job_lane_status_created_at (lane, status, created_at)` — `JobWorker`가 레인마다 반복 폴링하는 최핫 경로(ADR-0019) |
| `countByOwnerTokenAndStatusIn` | `owner_token=? AND status IN (...)` | 없음 | **추가** `idx_job_owner_token_status (owner_token, status)` — 업로드마다(단건·배치 모두) 쿼터 판정에 호출 |
| `countByLaneAndStatusAndCreatedAtBefore` | `lane=? status=? created_at<?` | 없음 | `idx_job_lane_status_created_at` 접두사로 커버 |
| `countByLaneAndStatus` | `lane=? status=?` | 없음 | 위와 동일 접두사로 커버 |
| `countByModuleIdAndStatus` | `module_id=? status=?` | 없음 | **기각** — 관리자 전용(`AdminController.getStats()`가 모듈마다 실패건수 조회), 모듈 수 ≤37(`ToolModule` 구현체 수), 저빈도. 별도 인덱스 비용 대비 이득 없음 |
| `findAllByExpiresAtBefore` | `expires_at<?` | 없음 | **추가** `idx_job_expires_at` — `TtlCleanupScheduler`가 60초마다 전체 스캔 |
| `findByStatusInOrderByCreatedAtAsc` | `status IN (DONE,FAILED) ORDER BY created_at LIMIT n` | 없음 | **측정: 인덱스가 있어도 안 쓰인다.** 현실적 분포(완료 상태가 절대다수, 회원 Job 영구보존)에서 DONE+FAILED가 테이블의 ~95%를 차지 — 논커버링 인덱스 레인지+PK 재조회보다 클러스터드 인덱스 풀스캔이 실제로 더 싸다고 옵티마이저가 (정확히) 판단함을 EXPLAIN으로 확인(`IndexUsageAuditTest#job_조기만료_대상_조회는_행_대부분이_걸려_풀스캔이_맞다`). 인덱스를 추가하지 않고 풀스캔을 그대로 accept — 호출 빈도도 낮음(디스크 사용량이 상한선을 넘었을 때만) |
| `findAllByBatchId` / `getBatchStats` | `batch_id=?` | 없음 | **추가** `idx_job_batch_id` — 배치 업로드 중 프론트가 반복 폴링(`GET /api/v1/batches/{id}`) |
| `findAllByStatusIn` | `status IN (...)` (관리자 활성 큐, 기본 PENDING+RUNNING) | 없음 | **추가** `idx_job_status_created_at (status, created_at)` — PENDING+RUNNING은 과도 상태라 소수(현실 분포 ~5%)라 선택적. EXPLAIN으로 실제 사용 확인 |
| `findAllByUserIdOrderByCreatedAtDesc` | `user_id=? ORDER BY created_at DESC` | 없음 | **추가** `idx_job_user_id_created_at` — 회원 작업 이력(050) 페이지. 회원 Job은 영구 보존되어 무기한 누적 |
| `anonymizeByUserId` | `user_id=?` (UPDATE) | 없음 | **기각** — 회원 탈퇴 시 1회성 이벤트, 무시할 수준의 빈도 |

### comment (`CommentRepository`, `CommentReportRepository`)

| 메서드 | WHERE/ORDER BY | V9 이전 인덱스 | 조치 |
|---|---|---|---|
| `findAllByModuleIdOrderByCreatedAtDesc` | `module_id=? ORDER BY created_at DESC` | 없음 | **추가** `idx_comment_module_id_created_at` — 툴 페이지 방문마다 호출 |
| `findAllByOrderByCreatedAtDesc` | 필터 없음, `ORDER BY created_at DESC`, **페이징 없음** | 없음 | **발견했으나 인덱스로 해결되지 않음, 기각.** `AdminController.getComments()`가 페이지네이션 없이 테이블 전체를 반환한다 — 인덱스를 추가해도 정렬 비용만 줄 뿐 "전체 반환"이라는 근본 문제는 그대로다. 이건 인덱스가 아니라 페이지네이션 도입이 답이라 이 이슈(인덱스 감사) 범위 밖으로 판단, 별도 이슈로 분리 필요(백로그 참고). `SuggestionRepository.findAll()`(`AdminController.getSuggestions()`)도 동일 패턴 |
| `anonymizeByUserId` | `user_id=?` (UPDATE) | 없음 | **기각** — 회원 탈퇴 시 1회성 |
| `existsByReporterIdAndCommentId` | `reporter_id=? AND comment_id=?` | 유니크 키 `(reporter_id, comment_id)` | 이미 커버됨, 조치 없음 |
| `search(status, reason nullable)` | 선택적 필터 + Page | 없음 | **기각** — 관리자 전용, 신고는 드문 이벤트, 테이블 자체가 작음 |
| `findReasonsForReportedUsers` | `comment_report.comment_id = comment.id` 조인, `comment.user_id IS NOT NULL` | 없음 | **기각** — 관리자 전용 집계(056 정지 판단), 저빈도, 소규모 테이블 |

### user (`UserRepository`)

| 메서드 | WHERE/ORDER BY | V9 이전 인덱스 | 조치 |
|---|---|---|---|
| `findByProviderAndProviderId` | 유니크 키 | 커버됨 | 조치 없음 |
| `search` | `LIKE '%...%'` (nickname/provider), Page | 없음 | **기각 — 인덱스로 해결 불가능한 케이스.** 이슈에서 최우선 점검 대상으로 지목했던 `AdminController.getUsers()` 검색 쿼리가 바로 이것. 앞뒤 와일드카드 LIKE는 B-tree 인덱스로 가속할 수 없다(리프 순회를 못 건너뜀) — 유일한 해법은 FULLTEXT 인덱스인데, 회원 수가 적은 이 규모(포트폴리오 프로젝트)에서는 과한 투자. 일반 인덱스를 추가해도 옵티마이저가 못 쓴다는 게 결론 |

### 개인화 (`UserFavoriteRepository`, `UserLikeRepository`, `UserRecentToolRepository`)

| 메서드 | WHERE/ORDER BY | V9 이전 인덱스 | 조치 |
|---|---|---|---|
| `findAllByUserIdOrderByCreatedAtDesc` / `...OrderByLastUsedAtDesc` | `user_id=? ORDER BY ...` | 유니크 키 `(user_id, module_id)` — `user_id` 필터는 커버, 정렬 컬럼은 아님 | **기각** — 유저 1명당 즐겨찾기·최근사용 행 수가 한 자릿수 수준(UI가 "최근 도구" 목록을 소량만 노출)이라, 필터된 소수 행을 메모리에서 정렬하는 비용이 사실상 0에 가깝다. 3번째 컬럼 조합 인덱스를 3개 테이블에 추가할 실익 없음 |
| `findByUserIdAndModuleId` / `existsByUserIdAndModuleId` / `deleteAllByUserId` | 유니크 키 선두 컬럼 | 커버됨 | 조치 없음 |

### refresh_token / revoked_access_token (`RefreshTokenRepository`, `RevokedAccessTokenRepository`, `RefreshTokenTheftEventRepository`)

| 메서드 | WHERE/ORDER BY | V9 이전 인덱스 | 조치 |
|---|---|---|---|
| `findByTokenHash` / `findByTokenHashForUpdate` | 유니크 키 `token_hash` | 커버됨 | 조치 없음 |
| `findAllByUserId` | `user_id=?` | 없음 | 프로덕션 코드에서 호출되지 않는 죽은 메서드 — 조치 없음 |
| `deleteAllByUserId` | `user_id=?` | 없음 | **추가** `idx_refresh_token_user_id` — 강제 로그아웃·RTR 탈취 감지 시 폐기(보안 임계 경로). 호출 빈도는 낮지만 테이블이 로그인/회전마다 계속 누적돼 스캔 비용이 계속 커짐 |
| `deleteAllByExpiresAtBefore` | `expires_at<?` | 없음 | **추가** `idx_refresh_token_expires_at` — `AuthTokenCleanupScheduler`가 60초마다 전체 스캔 |
| `RevokedAccessTokenRepository.deleteAllByExpiresAtBefore` | `expires_at<?` | 없음 | **추가** `idx_revoked_access_token_expires_at` — 같은 스케줄러, 같은 60초 주기 |
| `countByUserId` / `countGroupedByUserIdIn` | `user_id=?` / `user_id IN` | `idx_refresh_token_theft_event_user_id`(V6) | 이미 커버됨, 조치 없음 |

### admin_action_log (`AdminActionLogRepository`)

| 메서드 | WHERE/ORDER BY | V9 이전 인덱스 | 조치 |
|---|---|---|---|
| `findAll(Pageable, Sort.by(performedAt desc).and(id desc))` | 필터 없음, 정렬만, 페이지네이션 있음 | 없음 | **추가** `idx_admin_action_log_performed_at_id (performed_at, id)` — 감사로그는 삭제되지 않고 무기한 누적된다. 오름차순 인덱스를 역방향으로 스캔해 filesort 없이 정렬을 대신하도록 구성, `Extra`에 `Using filesort`가 없음을 EXPLAIN으로 확인 |

### tool_stats (`ToolStatsRepository`)

전부 PK(`module_id`) 조회/UPSERT — 이미 PK로 커버됨, 조치 없음.

## 캐싱 후보 감사

| 후보 | 채택/기각 | 근거 |
|---|---|---|
| `ToolController.listModules()` | 캐싱 대상 아님 | DB 쿼리 자체가 없음 — `ToolService`가 Spring 빈 레지스트리(`Map<String, ToolModule>`)를 메모리에서 조회하는 O(1) 연산이라 캐시할 게 없다 |
| `ToolStatsService.findAll()` (`AdminController.getStats()`) | **기각** | `tool_stats` 테이블은 최대 37행(`ToolModule` 구현체 수)뿐이고 관리자 전용 저빈도 호출. 캐싱 인프라 비용이 이득보다 크다 |
| `ToolStatsService.getOrCreate`/`incrementUseCount`/`incrementLikeCount` (툴 실행·좋아요마다) | **기각** | 이미 PK 단건 조회·원자적 UPSERT라 O(1). 게다가 이 값 자체가 매 실행마다 갱신되는 카운터라 캐시를 두면 실행할 때마다 무효화해야 해서 캐시 적중률이 구조적으로 낮다 — 캐싱이 오히려 복잡도만 늘림 |
| `CommentService.getComments(moduleId)` (툴 페이지 방문마다) | **기각** | V9로 `idx_comment_module_id_created_at` 인덱스가 이미 붙어 조회 자체가 싸졌고, 댓글 작성마다 캐시를 무효화해야 해서 쓰기 빈도 대비 이득이 낮다. 실사용 트래픽 증거 없이 도입할 근거 없음 |

**결론: 이번 감사에서 신규로 도입할 캐싱은 없다.** 이는 새 판단이 아니라 CONTEXT.md에 이미 기록된
"캐싱 (Light 모듈 결과): 도입 보류 — 남은 백엔드 Light 모듈은 실사용 트래픽 증거가 생기면 재검토"
결정을 이번에 감사한 나머지 후보(모듈 통계, 댓글 목록)까지 같은 근거로 확장 재확인한 것이다.

## 측정 근거

`IndexUsageAuditTest`(back/src/test/java/com/back/migration/)가 회귀 가드다:

- V9까지 Flyway를 실제로 적용한 별도 Testcontainers MySQL(다른 리포지토리 테스트는 로컬 프로파일
  `create-drop`+Flyway 비활성으로 떠서 V9 인덱스가 아예 존재하지 않는 스키마에서 돈다 —
  `FlywayBaselineDriftTest`와 동일한 이유로 별도 컨테이너를 쓴다).
- `job` 5만 행, `comment`/`refresh_token`/`revoked_access_token`/`admin_action_log` 각 2만 행을
  현실적 분포(예: job.status는 완료 상태가 절대다수, expires_at은 대부분 미래)로 시딩 후
  `ANALYZE TABLE`로 통계를 안정시키고 `EXPLAIN`으로 옵티마이저의 실제 선택을 확인한다.
- 12개 테스트 중 11개는 "인덱스가 실제로 쓰인다"를, 1개(`job_조기만료_대상_조회는_행_대부분이_걸려_풀스캔이_맞다`)는
  "인덱스가 있어도 이 쿼리엔 안 쓰이는 게 옵티마이저의 올바른 판단이다"를 의도적으로 확인한다 —
  이론이 아니라 측정을 근거로 남기라는 이슈 108의 요구를 코드 없는 주장이 아니라 실행 가능한
  회귀 테스트로 만족시킨다.

## 백로그로 넘긴 항목

- **`comment`/`suggestion` 관리자 목록 페이지네이션 부재** — `AdminController.getComments()`,
  `AdminController.getSuggestions()`가 테이블 전체를 페이지네이션 없이 반환한다. 인덱스로 해결되는
  문제가 아니라 API 응답 설계 문제라 이 이슈 범위 밖. 별도 이슈로 분리 필요.
