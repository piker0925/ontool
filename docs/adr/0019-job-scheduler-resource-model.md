# ADR-0019 Job 스케줄러 자원 모델 — 등급 레인·익명 공정성·용량 인지 디스패치

## 상태
확정 (2026-07-14)

## 요약 (TL;DR)

단일 무료 VM(2 OCPU/12GB, MySQL·JVM·워커 공유)에서 "아무리 많은 파일이 와도 전부, 공정하게, 정직한 대기 피드백과 함께 처리"하기 위한 스케줄러 기반. 외부 MQ 없이 MySQL Job 큐 + Spring 스레드풀만으로 구현한다. 핵심 5축:

1. **등급 레인** — 작업을 `HEAVY`/`VIDEO` 레인으로 나누고 레인별 동시 실행 상한을 `Semaphore` permit으로 강제.
2. **용량 인지 디스패치** — 폴링당 1건이던 걸 "레인별 남은 permit만큼" 배치로 꺼내 제출. `CallerRunsPolicy` 제거.
3. **익명 식별 + 공정 스케줄링** — `X-Client-Id` 헤더로 사용자를 식별하고, 소유자 간 라운드로빈으로 굶김 방지.
4. **진입 제어** — 사용자별 in-flight 쿼터(기본 200)로 남용만 차단, 하드 캡은 없음.
5. **진행 가시화** — 큐 순번·진행률·ETA를 상태 응답/SSE로 노출.

---

## 배경 (문제)

기존 워커(`JobWorker.poll` + `ThreadPoolTaskExecutor`)에는 세 가지 한계가 있었다.

1. **디스패치 병목 (이슈 031)**: `JobRepository.findFirstPendingWithLock()`이 `SELECT ... LIMIT 1 FOR UPDATE SKIP LOCKED`라, `poll()`이 폴링 주기(3초)당 **딱 1건만** 실행 풀에 제출했다. `maxPoolSize=5`로 동시에 5개를 처리할 수 있어도, **새 Job이 풀에 들어가는 공급 속도 자체가 3초/건**으로 묶여 있었다. 배치 50개 = 최소 150초, 풀 크기와 무관하게.
2. **작업 비용 균일 가정**: 이미지 리사이즈(수백 ms)와 (예정된) 비디오 트랜스코드(수 분)를 같은 큐·같은 풀에서 처리하면, 영상 하나가 워커를 수 분 점유하는 동안 다른 사용자의 빠른 작업이 전부 뒤에서 굶는다(head-of-line blocking).
3. **공정성 부재**: 순수 `created_at` FIFO라, 한 사용자가 수백 개를 던지면 다른 사용자가 무한정 뒤에서 대기한다.

## 배경 (물리 제약 — 설계를 지배하는 상수)

배포 인스턴스: **VM.Standard.A1.Flex — 2 OCPU(ARM Ampere) / 12GB / 블록 스토리지 전용, Oracle Linux 9 aarch64** (ap-chuncheon-1).

- **2 OCPU = 실제 물리 코어 2개** (ARM은 SMT 없음). 이 2코어를 **MySQL + JVM(Spring) + 워커(+미래의 FFmpeg)가 공유**한다(BE·DB 동일 박스). → 비디오에 실제로 내줄 수 있는 건 사실상 코어 1개.
- **병목은 RAM이 아니라 CPU 코어 수.** 12GB는 JVM 힙 + MySQL + FFmpeg 하나엔 넉넉.
- Always Free A1 한도(4 OCPU/24GB)의 나머지 절반은 **다른 인스턴스가 사용 중이라 리셰이프 불가** → 2코어가 사실상 상한.
- **ARM**: 네이티브 바이너리(FFmpeg 등)는 arm64 빌드 필수, GPU 없음(순수 SW 인코딩, x265 특히 느림).

이 제약이 "동시성을 무한히 늘린다"는 접근을 원천 차단한다. 목표는 **폴링 주기가 인위적 병목이 되지 않게** 하는 것이지 물리적으로 불가능한 병렬성을 만드는 게 아니다.

---

## 아키텍처 개요

```
[프론트]  apiClient(axios, X-Client-Id 헤더)         EventSource(SSE, jobId만)
   │  POST /tools/{id}/upload (multipart + 헤더)          │ GET /jobs/{id}/stream
   ▼                                                      ▼
[ToolController.upload] ── ownerToken = header,  lane = module.getLane()
   │  JobService.assertWithinQuota(owner, N)  ── 초과 시 QUOTA_EXCEEDED(429)
   │  JobService.create(moduleId, lane, owner, ...)  → Job(status=PENDING) 저장
   ▼
[ MySQL job 테이블 = 진짜 큐 ]  (유실 없음, 재시작에도 보존)
   ▲                                                     │
   │  @Scheduled(3s) @Transactional                      │
[JobWorker.poll] ──▶ 레인마다:                            │
   │   available = LaneLimiter.available(lane)            │
   │   candidates = findPendingBatchByLane(lane)  (LIMIT 100 FOR UPDATE SKIP LOCKED)
   │   chosen = selectFair(candidates, available)  (소유자 라운드로빈)
   │   각 chosen: tryAcquire(permit) → RUNNING 저장 → taskExecutor.execute(processJob)
   ▼
[processJob (워커 스레드)] startedAt 기록 → module.process() → 결과 저장 → DONE/FAILED
   └─ finally: LaneLimiter.release(lane)  (permit 반납 → 다음 폴링이 슬롯 즉시 재사용)
```

레인별 동시성 상한(`LaneLimiter`)이 실질적인 병렬성 상한이고, DB의 PENDING 행이 진짜 큐다. 실행 풀은 그저 "레인 permit 합만큼만 담는 그릇"이다.

---

## 결정 (구현됨)

### 1. 작업 등급 레인 (`Semaphore` 기반 동시성 상한)

`ToolModule`에 `default Lane getLane() { return Lane.HEAVY; }`를 추가. `Lane`은 `HEAVY`/`VIDEO`. 비디오 모듈(035~)만 `VIDEO`로 오버라이드한다.

`LaneLimiter`(`@Component`)가 레인별 `Semaphore`를 들고 `tryAcquire(lane)`·`release(lane)`·`available(lane)`을 제공한다. permit 기본값:

- **VIDEO = 1**: 영상 인코딩은 코어 1개를 통째로 먹으므로 동시 1개만. 나머지 1코어를 MySQL·JVM·웹에 남긴다.
- **HEAVY = 2**: 이미지/PDF는 짧아 동시 2개.

permit 수는 `application.yml`(`scheduling.worker.lane.heavy`, `scheduling.worker.lane.video`)로 노출 → **재배포 없이 튜닝**, 4 OCPU로 확장되면 값만 올리면 됨.

`AsyncConfig.taskExecutor`: `corePoolSize = maxPoolSize = queueCapacity = heavy + video`(기본 3). 디스패치가 permit만큼만 제출하므로 큐가 찰 일이 없고, 거부 정책은 `AbortPolicy`(설계상 거부는 발생하지 않아야 하므로, 나면 조용히 묻지 않고 드러나게).

### 2. 용량 인지 디스패치 (031 흡수 + `CallerRunsPolicy` 제거)

`findFirstPendingWithLock()`(LIMIT 1)을 **레인별 배치 조회**(`findPendingBatchByLane`, `LIMIT 100 FOR UPDATE SKIP LOCKED`)로 바꾸고, `poll()`은 각 레인의 **남은 permit 수만큼만** 제출한다(여유 0이면 그 레인 skip). 애초에 실행 가능한 만큼만 꺼내므로 실행 풀 큐가 찰 일이 없다.

`ThreadPoolExecutor.CallerRunsPolicy`는 **제거**했다. `poll()`은 `@Transactional`이라, 거부 시 CallerRuns는 그 Job을 **poll 스레드 위에서, 열린 트랜잭션(행 잠금) 안에서** 동기 처리한다 — 작업 처리 내내 DB 락을 붙잡는 정합성 문제(튜닝이 아니라 correctness). permit 기반 디스패치로 거부 자체를 없애고, 방어적으로 거부되면 permit을 반납하고 Job을 PENDING으로 되돌려 다음 틱 재시도.

실행 풀 `queueCapacity`는 임의로 키우지 않는다. 실행 큐를 크게 잡으면 DB 큐와 메모리 큐가 이중으로 생기고, 대용량 파일이 12GB RAM에 동시에 여러 개 대기하는 위험이 생긴다 — **DB가 진짜 큐 역할을 하게 두는 게 원칙.**

### 3. 익명 사용자 식별 + 공정 스케줄링

로그인 없는 서비스(ADR-0009) 유지하되, 공정성·쿼터를 위해 **익명 식별자**를 둔다. 프론트가 UUID를 `localStorage`(`dtk_cid`)에 만들어 매 작업 생성 요청에 **`X-Client-Id` 헤더**로 싣고, 백엔드는 그 값을 Job의 `ownerToken`으로 기록한다.

**처음엔 서버 발급 httpOnly 쿠키로 구현했다가 헤더 토큰으로 바꿨다.** 프론트(Vercel)와 백엔드(OCI)가 교차 사이트라 쿠키가 서드파티 취급 → Safari(ITP) 기본 차단·Chrome 폐지 대상 → 차단되면 매 요청 새 토큰이 발급돼 per-user 식별이 조용히 무력화된다. 헤더 토큰은 쿠키가 아니라 SameSite/ITP와 무관하고 CORS credentials·SameSite 설정도 불필요해 더 간단·견고하다. 식별자는 인증 비밀이 아니라 익명 공정성·쿼터 "버킷"이라(위조해도 권한 상승·타인 결과 접근 불가 — 결과는 추측 불가한 jobId UUID로만 접근) JS 가독성은 문제되지 않는다. 식별이 필요한 지점은 작업 생성뿐이고 그건 axios가 헤더를 싣는다 → 헤더를 못 싣는 SSE(상태 조회, jobId만 사용)와 무관.

**공정 스케줄링**: 순수 FIFO 대신 `selectFair`가 후보(created_at 오름차순)를 소유자별로 묶어 **서로 다른 `ownerToken` 간 라운드로빈**으로 permit을 채운다. 한 명이 100개를 던져도 다른 사람이 뒤에서 굶지 않는다. 그룹 내부는 오래된 순이라 같은 소유자 안에서는 FIFO가 유지된다. 단일 워커 인스턴스라 in-memory 선택으로 충분하고, `SKIP LOCKED`는 방어적으로 유지.

### 4. 진입 제어 — 관대하게 받되 남용만 차단

입력 크기에 **하드 캡을 두지 않는다** (사용자 결정: 큰 것도 받되 UI로 경고·가시화). 대신 **사용자별 in-flight 쿼터**(`identity.quota.max-in-flight`, 기본 **200**, PENDING+RUNNING 합)로 남용만 막는다. `JobService.assertWithinQuota(ownerToken, incoming)`이 `현재 in-flight + incoming > 상한`이면 `QUOTA_EXCEEDED`(HTTP 429). 배치는 `incoming = files.size()`로 미리 합산해 **부분 생성 없이** 한 번에 판정한다.

- 200으로 넉넉히 둔 이유: "전부 처리" 목표상 큰 배치도 한 방에 통과시키되, 한 명이 수백 개 이상으로 큐를 독점하는 것만 막는다. **한 번의 배치가 200을 넘으면 배치 전체가 거부**되므로 더 큰 배치가 필요하면 값을 올린다.
- `ownerToken`이 null(헤더 없는 비정상 경로)이면 쿼터 판정은 생략 — 공정성 라운드로빈이 여전히 보호한다.

### 5. 진행 가시화 — 큐 순번·진행률·ETA

"관대하게 받는다"의 정직한 짝. `JobStatusResponse`와 SSE payload에 추가:

- **queuePosition** — `JobService.queuePosition`: 같은 레인에서 이 작업보다 먼저 생성된 PENDING 수(대략치). PENDING이 아니면 0.
- **progress** (0~100) — Job 필드. DONE 시 100. 중간값은 롱잡(비디오)이 채운다(§ 미룬 것 참조).
- **etaSeconds** — `JobService.etaSeconds`: **진행률이 있는 RUNNING에서만** 정직하게 계산(`경과 × (100-progress)/progress`). PENDING 등에서는 `null`(큐 순번으로 안내). 근거 없는 추정치를 만들지 않는다.

SSE는 상태뿐 아니라 `progress`·`queuePosition`이 바뀌어도 푸시한다(시그니처 = `status:progress:queuePosition` 변경 감지).

프론트(`ToolPage`)는 `jobProgress` 상태로 받아: 대기 중이면 "앞에 N개", 진행률이 있으면 진행률 바 + "N% · 약 M분 남음", 그 외엔 "처리 중입니다…".

---

## 디스패치 알고리즘 (의사코드)

```
poll():                              # @Scheduled(fixedDelay=3s), @Transactional
  for lane in [HEAVY, VIDEO]:
    dispatchLane(lane)

dispatchLane(lane):
  available = laneLimiter.available(lane)          # 남은 permit
  if available <= 0: return                        # 여유 없음 → PENDING 유지, 다음 틱
  candidates = repo.findPendingBatchByLane(lane)   # LIMIT 100 FOR UPDATE SKIP LOCKED
  if candidates.isEmpty(): return
  for job in selectFair(candidates, available):    # 소유자 라운드로빈으로 available개
    if not laneLimiter.tryAcquire(lane): break     # 방어적(계산과 어긋나면 다음 틱)
    job.status = RUNNING; save(job)                # poll 트랜잭션이 커밋될 때까지 행 잠금 유지
    try: taskExecutor.execute(() -> processJob(job.id, lane))
    catch RejectedExecutionException:
      laneLimiter.release(lane); job.status = PENDING; save(job)   # 되돌림

processJob(jobId, lane):             # 워커 스레드, 각 save는 자체 트랜잭션
  job = repo.findById(jobId)
  job.startedAt = now()              # poll이 아니라 여기서 (아래 정합성 분석 참조)
  try:
    result = module.process(input)
    if result.isFile(): save file; job.resultKey/resultText = ...
    else: job.resultText = ...
    job.status = DONE; job.progress = 100
  catch: job.status = FAILED
  finally:
    laneLimiter.release(lane)        # permit 반납 먼저
    save(job); deleteInputs(job)

selectFair(candidates, limit):       # candidates는 created_at 오름차순
  byOwner = groupBy(ownerToken, preserving order)   # LinkedHashMap<owner, Deque>
  chosen = []
  while chosen.size < limit:
    progressed = false
    for queue in byOwner.values():                  # 소유자별 한 바퀴
      if chosen.size >= limit: break
      j = queue.poll(); if j: chosen.add(j); progressed = true
    if not progressed: break                         # 후보 소진
  return chosen
```

---

## 동시성·정합성 분석 (이 설계의 핵심 — 리뷰 시 필독)

### permit 생명주기
permit은 **poll 스레드에서 `tryAcquire`**, **워커 스레드의 `processJob` finally에서 `release`**된다. `finally`라 예외·실패에도 항상 반납된다. `available(lane)`은 실행 중(permit 보유) 작업 수를 정확히 반영하므로, 다음 폴링의 배치 크기 계산이 실제 여유와 일치한다. (JVM/스레드가 처리 도중 죽으면 permit이 샐 수 있으나 이는 프로세스 재시작으로만 발생하는 파국적 상황.)

### 트랜잭션 스냅샷 경쟁 — `startedAt`을 왜 `processJob`에서 찍나
`poll()`은 `@Transactional`이고 `findPendingBatchByLane`의 `FOR UPDATE`로 선택된 행을 **poll 트랜잭션이 커밋될 때까지 잠근다.** `poll`은 `RUNNING`으로 바꿔 저장하지만 아직 커밋 전이다. 비동기 `processJob`은 **다른 트랜잭션**에서 `findById`로 그 Job을 읽는데, InnoDB의 비잠금 일관 읽기는 **커밋 전 스냅샷(PENDING, startedAt=null)**을 본다(잠금에 막히지 않음). 그리고 `processJob`의 최종 `save`(UPDATE)는 poll이 커밋해 잠금을 풀 때까지 **블록**되었다가 실행되어 `DONE`을 쓴다 → 최종 상태는 항상 `DONE`으로 정합. 

문제는 만약 `startedAt`을 `poll`에서 찍으면, `processJob`이 읽은 스냅샷에는 그 값이 없어 최종 `save`가 `startedAt=null`로 **덮어써 유실**된다. 그래서 `startedAt`은 **`processJob` 시작 시점(워커 스레드, 그 트랜잭션에서)** 찍는다. 관측자가 보는 중간 상태 `RUNNING`은 poll이 커밋한 값이라 문제없다. (`@Version`이 없어 DONE 쓰기가 깔끔히 이긴다.)

### 이중 처리 안전성
`findPendingBatchByLane`은 `status='PENDING'`만 조회하므로 이미 `RUNNING`인 건 재선택되지 않는다. `FOR UPDATE SKIP LOCKED` + `@Scheduled(fixedDelay)`(직전 실행 종료 후에야 다음 실행)로 폴링 중첩도 없다. 단일 워커 인스턴스라 근본적으로 경쟁이 없고, SKIP LOCKED는 방어적 이중 안전장치.

### 공정성 보장의 경계
`selectFair`는 라운드로빈으로 소유자 독점을 막지만, 그 보장은 **100건 후보 창** 안에서다(`LIMIT 100`). 한 소유자가 한 레인에 100건 이상을 몰면, 그 백로그가 100 밑으로 빠질 때까지 더 늦게 온 다른 소유자는 대기할 수 있다. (LIMIT을 상수 100으로 둔 이유: 네이티브 쿼리를 파싱하는 JSqlParser가 `LIMIT :param` 바인드를 거부함.)

---

## 데이터 모델 변경 (`job` 테이블)

| 컬럼 | 타입 | 의미 |
|------|------|------|
| `owner_token` | varchar(36) | 익명 소유자(=`X-Client-Id`). 공정성·쿼터 기준. null 허용(헤더 없으면) |
| `lane` | varchar(10) enum | `HEAVY`/`VIDEO`. 생성 시 `module.getLane()`으로 확정. not null(기본 HEAVY) |
| `started_at` | datetime | RUNNING 전환(실제 처리 시작) 시각. ETA 계산 기준. null 허용 |
| `progress` | int | 0~100. DONE 시 100. not null(기본 0) |

`ddl-auto`(local=create-drop, prod=update)로 스키마 반영.

## 계약·설정 레퍼런스

**요청 헤더** — `X-Client-Id: <uuid>` (작업 생성 요청에 프론트 axios가 자동 부착). 없어도 동작(쿼터만 생략).

**`JobStatusResponse`** (`GET /api/v1/jobs/{id}` 및 SSE payload):
```
{ id, status, queuePosition, progress, etaSeconds(null 가능), expiresAt }
```

**설정 노브** (프로파일 yaml):

| 키 | 기본 | 의미 |
|----|------|------|
| `scheduling.worker.delay` | 3000 | 폴링 주기(ms) |
| `scheduling.worker.lane.heavy` | 2 | HEAVY 동시 실행 상한 |
| `scheduling.worker.lane.video` | 1 | VIDEO 동시 실행 상한 |
| `identity.quota.max-in-flight` | 200 | 사용자별 PENDING+RUNNING 상한 |

---

## 지금 구현한 범위 vs 035(비디오)로 미룬 것

**구현·검증 완료 (이번)**: 등급 레인·`LaneLimiter`, 용량 인지 배치 디스패치, `CallerRunsPolicy` 제거, 익명 헤더 식별, 공정 라운드로빈, in-flight 쿼터, 큐 순번·진행률·ETA 배관(필드·서비스·SSE·프론트 UI).

**의도적으로 035로 미룸 (아직 코드 없음 — 오해 방지용 명시)**:

- **모듈→진행 보고 콜백**: 현재 `ToolModule.process(ToolInput)`은 끝에 결과 하나만 반환한다. 처리 중간에 `progress`를 갱신할 통로가 없어 **진행률 바·ETA는 지금은 비활성**(단건은 0→100 점프). 비디오 모듈이 FFmpeg 진행을 파싱해 `job.setProgress()`를 주기적으로 부르려면 `process()`에 진행 콜백을 추가해야 하며, 이는 구체적 비디오 유스케이스와 함께 설계하는 게 맞아 035 스코프로 둔다.
- **작업 타임아웃 + 외부 프로세스 kill**: 망가진 영상이 FFmpeg를 무한 점유하는 걸 끊는 장치. 비디오 없이는 불필요.
- **스트리밍 I/O 강제**: 대용량 파일을 `byte[]`로 올리지 않고 디스크 경로로만 다루는 원칙. 비디오 모듈 구현 시 강제.
- **디스크 예산·대용량 경고**: 총 업로드+결과 용량 상한, "오래 걸릴 수 있음" 경고 신호. 실제 블록 스토리지 용량(`df -h`) 확인 후 035에서 수치 확정.

---

## 이유

- 진짜 병목은 워커 풀 크기가 아니라 `LIMIT 1` 폴링이었다 — 풀은 이미 5까지 있었는데 공급이 3초/건으로 막혀 있었다.
- 2코어를 MySQL·JVM·FFmpeg가 공유하는 단일 박스에서 **분산 MQ(Kafka/RabbitMQ)·세그먼트 병렬 트랜스코딩·오토스케일링은 오히려 마이너스**(없는 코어를 오케스트레이션 오버헤드로 더 갉아먹음). 이들은 수평 확장을 전제하는데 이 프로젝트엔 그 축이 없다.
- "작은 파일 먼저(SJF)"는 평균 대기 최적이지만 큰 작업(비디오)을 굶긴다 — 등급 레인으로 그 이득(짧은 작업이 긴 작업 뒤에 안 막힘)을 기아 없이 얻는다.
- "다 처리하고 싶다"는 이미 DB 큐가 유실 없이 보장한다. 실제 요구는 "전부, **공정하게**, 정직한 대기 피드백과 함께" — 동시성 문제가 아니라 쿼터·공정성·가시화 문제로 푼다.

## 기각한 대안

- **인스턴스 리셰이프(4 OCPU/24GB)**: 코어 2배가 가장 큰 무료 레버였으나, 나머지 A1 한도를 다른 인스턴스가 사용 중이라 불가.
- **외부 메시지 큐(Redis/RabbitMQ/Kafka)**: 위 이유로 단일 박스엔 과함. MySQL SKIP LOCKED로 충분.
- **입력 하드 캡(크기/길이 거부)**: 사용자가 "관대하게 받고 UI로 경고·가시화"를 택함. 남용은 in-flight 쿼터로만 막는다.
- **가상 스레드(JDK 25)**: 이미지/비디오 처리는 CPU-bound라 I/O 대기용 가상 스레드의 이점이 없다.
- **서버 발급 httpOnly 쿠키**: 교차 사이트 서드파티 쿠키 차단(§3)으로 헤더 토큰으로 대체.
- **순수 SJF / 완전한 WFQ**: 기아·복잡도 대비 이득이 라운드로빈으로 충분히 커버됨.

## 결과 (변경 파일)

- **백엔드 신규**: `tool/model/Lane.java`, `job/service/LaneLimiter.java`.
- **백엔드 변경**: `Job`(+4컬럼), `ToolModule.getLane()`, `AsyncConfig`(레인 합 크기 풀·AbortPolicy·CallerRuns 제거), `JobRepository`(배치조회·소유자 카운트·큐순번), `JobWorker`(용량 인지·공정 디스패치·permit·startedAt 위치), `JobService`(create 시그니처·쿼터·queuePosition·etaSeconds), `ToolController`(X-Client-Id→ownerToken, lane, 쿼터), `JobController`(진행 필드·SSE 시그니처), `JobStatusResponse`(+3필드), `ErrorCode.QUOTA_EXCEEDED`, 프로파일 yaml(레인·쿼터 노브).
- **프론트 변경**: `api/client.ts`(dtk_cid localStorage + X-Client-Id 헤더), `pages/ToolPage.vue`(jobProgress 상태·진행률 바·ETA·formatEta).
- **테스트**: `JobWorkerTest`(latch 블로킹 모듈로 레인 상한 2 vs 1 vs 전부 구분), `JobWorkerFairnessTest`(라운드로빈 vs FIFO 구분), `JobServiceTest`(쿼터 경계·배치·null 소유자).

## 검증 (2026-07-14)

- 백엔드 전체 테스트 통과(레인 동시성·공정성·쿼터 포함, 실제 MySQL Testcontainers).
- 프론트 `vue-tsc` 클린 + 304 테스트 통과.
- **브라우저 E2E**: 로컬 스택에서 `dtk_cid`가 localStorage에 발급되고, 앱 `apiClient`가 `X-Client-Id`를 자동 부착해 교차 출처(5173→8080)로 전송, **CORS·콘솔 에러 0**, DB `owner_token`이 그 토큰과 일치, `lane=HEAVY`·`progress=100`·`started_at` 기록, 실제 UI 업로드→SSE→다운로드 전 구간 정상.
