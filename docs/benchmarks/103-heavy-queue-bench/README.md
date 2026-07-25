# Heavy 큐 공정성 · Admission Control 로컬 벤치마크 (이슈 103)

## 목적

README "핵심 엔지니어링"·"Heavy 처리 구조"가 큐·레인 동시성·admission control을 정성적으로만
설명하고 실측 수치가 없다는 지적에서 시작했다. 그릴링(2026-07-23) 중 목적을 재정의했다:

- **1차 목적**: ADR-0019가 설계한 소유자별 라운드로빈 공정 스케줄링이 실제로 작동하는지, **그리고 어디까지
  작동하는지 경계**를 실험으로 확인한다.
- **2차 목적**: `AdmissionControl`의 큐 깊이·디스크 예산 임계값이 과부하 시 시스템을 뻗게 하는 대신
  깔끔하게 거절(503/507)하는지 확인한다.
- **절대 처리량(jobs/min)은 스코프 밖이다.** 로컬 노트북과 운영 Ampere A1(2 OCPU)은 ISA·메모리 대역폭·
  GPU 유무가 달라 절대 수치가 신뢰되지 않는다(advisor 검토). 대신 **공정성·거부 동작 같은 로직 기반 속성**
  (하드웨어 무관)을 검증 대상으로 삼는다. 아래 모든 수치는 "측정(로컬)"이며, 운영 절대 처리량으로 해석하면 안 된다.

## 환경

- 로컬 Docker MySQL 컨테이너 전용 인스턴스(공유 docker-compose의 3306 포트가 아님 — 다른 워크트리와
  동시 작업 중이라 공유 자원 충돌을 피하기 위해 `devtoolbox-bench-mysql` 컨테이너를 포트 3307로 별도 기동).
- 백엔드는 `--server.port=8103`, `--spring.profiles.active=local,local-benchmark`로 로컬 JVM에서 직접 실행.
- **CPU 제한(`--cpus=2`) 재현 불필요**: `LaneLimiter`의 세마포어 permit(VIDEO=1, HEAVY=2)이 하드웨어 속도와
  무관하게 동시성 상한을 강제하는 진짜 병목이라, 로컬 CPU가 더 빨라도 공정성 경계·거부 동작 같은 정성적
  결과는 바뀌지 않는다.
- `local-benchmark` 프로파일(`back/src/main/resources/application-local-benchmark.yaml`)이 앱 레벨
  rate limiter(ADR-0021, 040)만 완화한다 — 벤치마크 스크립트가 같은 로컬 IP(127.0.0.1)에서 소유자별로
  수십 건을 짧은 시간에 쏘는데, rate limiter의 키는 IP이지 소유자가 아니므로 기본값(60초당 200건)이면
  큐 공정성 실험 자체가 429로 막힌다. **운영 프로파일(`application-prod.yaml`)은 이 파일을 전혀 참조하지
  않고 diff도 없다** — `spring.config.activate.on-profile: local-benchmark` 가드로 명시적으로 켜지 않으면
  완전히 무시된다.

## 도구

- bash + curl (multipart 업로드 + 상태 폴링). 신규 의존성 없음.
- 타임스탬프는 벤치마크 전용 MySQL 컨테이너에서 `job` 테이블을 **직접 SELECT**해 `created_at`/`started_at`을
  가져온다(정확, DB에 이미 저장된 값). 완료 시각(`completedAt` 컬럼 없음)은 스크립트가 `GET /api/v1/jobs/{id}`를
  0.3초 간격으로 폴링하다 `status`가 `DONE`/`FAILED`로 바뀐 첫 시점의 벽시계 시각으로 대체.
- `X-Client-Id` 헤더로 시뮬레이션 소유자를 구분.

## 재현 방법

```bash
# 1. 벤치마크 전용 MySQL (공유 3306과 별개)
docker run -d --name devtoolbox-bench-mysql \
  -e MYSQL_DATABASE=devtoolbox_bench -e MYSQL_USER=devtoolbox -e MYSQL_PASSWORD=1234 \
  -e MYSQL_ROOT_PASSWORD=root -p 3307:3306 mysql:8.0

# 2. 백엔드 빌드 + 기동 (local-benchmark 프로파일)
cd back && ./gradlew bootJar -x test
java -jar build/libs/back-0.0.1-SNAPSHOT.jar \
  --server.port=8103 \
  --spring.profiles.active=local,local-benchmark \
  --spring.datasource.url="jdbc:mysql://localhost:3307/devtoolbox_bench?serverTimezone=UTC&characterEncoding=UTF-8" \
  --storage.upload-dir=/tmp/devtoolbox-bench-uploads

# 3. 시나리오 실행 (scripts/ 디렉토리에서)
cd ../docs/benchmarks/103-heavy-queue-bench/scripts
./scenario1-heavy-2owner.sh
./scenario2-heavy-3owner-starvation.sh
./scenario3-video-latecomer.sh

# 4. 과부하 거부 시나리오는 워커를 정지한 별도 인스턴스로 재기동 후 실행
#    (--scheduling.worker.delay=3600000 추가, 그래야 "몇 번째 요청에서 거부되는가"가 결정적)
./scenario4-overload-rejection.sh
# 디스크 예산 거부(507)는 --storage.disk-budget-bytes=1024 로 재기동 후
./scenario4b-storage-full.sh
```

## 테스트 매트릭스 & 결과 (측정: 2026-07-24, 127 수정 전 baseline)

### 1. HEAVY 레인(permit=2), 소유자 2명 — 공정성 성립 케이스

A가 image-resize 40건을 먼저 투입하고 곧바로 B가 1건 투입.

| 항목 | 값 |
|---|---|
| B의 시작 순위(`started_at` 기준, 동률 포함) | **4번째** (전체 41건 중) |
| B가 시작된 시점에도 아직 시작 못 한 A의 잔여 작업 | **37 / 40건** |

**해석**: B는 A의 39건 백로그가 남아있는 상태에서 두 번째 폴링 틱(약 3초 후)에 바로 서비스됐다.
순수 FIFO였다면 B는 41번째(A 40건을 모두 처리한 후)에나 시작됐을 것이다 — ADR-0019가 의도한
라운드로빈 공정성이 **owner 수(2) ≤ permit 수(2)**일 때는 정확히 작동한다.
원본 데이터: [`raw/scenario1/all-jobs.tsv`](raw/scenario1/all-jobs.tsv), [`raw/scenario1/summary.txt`](raw/scenario1/summary.txt)

### 2. HEAVY 레인(permit=2), 소유자 3명 — 공정성 경계 밖 케이스 (127 이전 baseline)

A·B가 각각 20건씩 먼저 투입, C가 뒤늦게 3건 투입.

| 항목 | 값 |
|---|---|
| C의 첫 작업이 PENDING을 벗어난 시각 | **56.6초** 경과 시점 |
| A+B 백로그가 완전히 빈 시각 | **59.1초** 경과 시점 |
| C의 PENDING 개수(0~56.6초 구간) | **계속 3건 그대로** (전혀 줄지 않음) |

**해석**: `JobWorker.selectFair`는 owner를 순회하다 `chosen.size() >= limit`이 되면 즉시 `break`한다
(JobWorker.java). permit(2) < owner 수(3)이면 매 틱 맵에 먼저 등록된 A·B만 한 건씩 골라지고, C는
A·B의 PENDING 백로그가 완전히 빌 때까지(이 실험에서는 거의 60초, 즉 전체 실험 시간의 처음부터 끝까지)
단 한 틱도 선택되지 못했다 — **2-owner 케이스만 테스트하면 발견할 수 없는 경계**다.
이 결과가 이슈 127(라운드로빈 소유자 확장 수정)의 **before 증거**다. 원본 데이터:
[`raw/scenario2/timeseries.csv`](raw/scenario2/timeseries.csv), [`raw/scenario2/all-jobs.tsv`](raw/scenario2/all-jobs.tsv)

### 2-후속. HEAVY 레인(permit=2), 소유자 3명 — 127 수정 후 재측정 (before/after)

127이 `JobWorker`에 레인별 `lastServedOwner`(마지막으로 서비스한 소유자)를 기억해, 다음 틱은 그
다음 소유자부터 owner 순회를 시작하도록(회전) 고쳤다. 같은 하네스(같은 스크립트, `N_A=20 N_B=20
N_C=3`)로 재실행한 결과(측정: 2026-07-25, 로컬):

| 항목 | Before(127 이전, 위 표) | After(127 이후) |
|---|---|---|
| C의 첫 작업이 PENDING을 벗어난 시각 | 56.6초 | **4.0초** |
| 그 시점 A/B 잔여 PENDING | 0건 / 1건 (**A·B 백로그가 이미 거의 다 빈 뒤에야** C 진입) | **18건 / 19건** (A·B 백로그가 여전히 두터운 상태에서 C 진입) |
| C의 3건이 전부 DONE된 시각 | 61.7초 (A+B가 완전히 빈 59.1초 **직후**) | **10.7초** (A+B는 총 40건 중 34건이나 남은 상태) |
| A+B 백로그가 완전히 빈 시각 | 59.1초 | 70.1초 (총 처리량은 거의 동일 — 처리 순서만 진짜 라운드로빈으로 바뀜) |

**해석**: C는 더 이상 A·B의 40건 백로그가 빌 때까지 기다리지 않는다 — 두 번째 폴링 틱(기본 주기
3초, 관측 4.0초)에 바로 서비스되고, A·B가 각각 18·19건이나 남아있는 상태에서도 회전이 개입해
C를 끼워 넣었다. A+B의 총 소요 시간(59.1초→70.1초)이 약간 늘어난 건 처리량 저하가 아니라
**공정성 확보의 예상된 트레이드오프**다 — 매 틱 permit 2개 중 하나를 C에게 양보하는 틱이 있으면
그만큼 A·B 몫 처리가 뒤로 밀린다(총 작업 43건을 permit 2개로 처리하는 총량 자체는 거의 동일,
순서가 owner 단위 FIFO에서 진짜 라운드로빈으로 바뀐 것뿐이다). 원본 데이터:
[`raw/scenario2-after-127/timeseries.csv`](raw/scenario2-after-127/timeseries.csv),
[`raw/scenario2-after-127/all-jobs.tsv`](raw/scenario2-after-127/all-jobs.tsv),
[`raw/scenario2-after-127/summary.txt`](raw/scenario2-after-127/summary.txt)

### 3. VIDEO 레인(permit=1), 소유자 2명 — 최악 대기시간

A가 video-to-gif 8건 투입, B가 뒤늦게 1건 투입.

| 항목 | 값 |
|---|---|
| B 투입 시점의 A 잔여 백로그 | 8건 |
| B의 체감 대기시간(투입→완료) | **25.9초** (측정, 로컬) |
| B보다 늦게 시작된 A 작업 수 | **0건** (B는 A의 8건 전부보다 늦게 시작됨) |

**해석**: permit=1이면 한 틱에 고를 수 있는 건 정확히 1건뿐이라, `selectFair`의 owner 순회는 항상
맵에 먼저 등록된 owner(A)를 먼저 뽑는다 — owner가 몇 명이든 permit=1에서는 **한 owner의 백로그가
전부 빌 때까지 다른 owner는 매 틱 밀린다.** 이건 버그가 아니라 이슈 103이 밝히려던 "라운드로빈
공정성의 경계"다: 공정성은 "다음 owner에게도 기회를 준다"는 것이지 "즉시 서비스"를 보장하지 않는다.
B의 최악 대기시간은 permit·틱 주기(약 3초)로 결정되지, 처리 자체(ffmpeg GIF 변환, 초 단위)로 결정되지
않는다 — **하드웨어 무관 성질**. 원본 데이터: [`raw/scenario3/all-jobs.tsv`](raw/scenario3/all-jobs.tsv)

### 4. 과부하 거부 — VIDEO 레인 큐 깊이 상한(QUEUE_FULL, 503)

워커를 정지(`--scheduling.worker.delay=3600000`)한 상태에서 동일 소유자로 연속 업로드.

| 요청 번호 | HTTP 상태 | 거부 직전 PENDING |
|---|---|---|
| 1~11 | 202 | 0~10 |
| **12** | **503 QUEUE_FULL** | 11 |

거부 후 PENDING은 **11건에 고정**(더 쌓이지 않음), 응답 바디는 즉시·깔끔한 JSON
(`{"code":"QUEUE_FULL", ...}`) — 시스템이 큐에 쌓이거나 느려지는 대신 문 앞에서 정상적으로 거절한다.

> **발견**: 이슈 원문은 그릴링 당시 추정으로 "11번째 요청에서 거부"를 예상했다. 실측 결과는 **12번째**다.
> `AdmissionControl.checkQueueDepth`는 `pendingCount > threshold`로 판정하고(threshold=10, **같음은
> 초과가 아님**), 이 판정이 **삽입 전** 카운트를 본다 — 11번째 요청 시점엔 PENDING이 10건이라 `10>10`이
> 거짓이라 통과하고, 그 결과 PENDING이 11이 된 다음 12번째 요청에서 `11>10`이 참이 되어 거부된다.
> 실측으로 검증하지 않았다면 문서에 틀린 수치("11번째")가 그대로 남았을 것이다.
> 원본 데이터: [`raw/scenario4/submit-log.csv`](raw/scenario4/submit-log.csv), [`raw/scenario4/rejection-body.json`](raw/scenario4/rejection-body.json)

### 4-부록. 디스크 예산 초과 거부(STORAGE_FULL, 507)

실제 운영 예산(기본 10GB)을 로컬에서 채우는 건 비현실적이라, `--storage.disk-budget-bytes=1024`(1KB)로
게이트 로직 자체만 저비용 검증했다 — **운영 디스크 사용량과는 무관한 합성(synthetic) 테스트**다.

| 요청 번호 | HTTP 상태 |
|---|---|
| 1 | 202 |
| **2** | **507 STORAGE_FULL** |

첫 업로드로 사용량이 1KB 예산을 넘자마자 다음 요청이 즉시 거부됨을 확인했다.
원본 데이터: [`raw/scenario4b-storage-full/log.txt`](raw/scenario4b-storage-full/log.txt)

## 스코프 밖으로 남긴 것

- **운영 실측 각주**(운영 `job` 테이블 읽기 전용 SELECT로 평균 대기시간 참고치 산출): 이 작업 환경에서
  운영 DB 접근 권한이 없어 실행하지 못했다. 저비용·선택 사항이라 후속으로 남긴다 — 운영 DB 접근 권한이
  있는 사람이 아래 쿼리 한 번으로 채울 수 있다:
  ```sql
  SELECT AVG(TIMESTAMPDIFF(SECOND, created_at, started_at)) AS avg_wait_seconds,
         COUNT(*) AS sample_size
  FROM job WHERE started_at IS NOT NULL AND created_at > NOW() - INTERVAL 30 DAY;
  ```
- ~~127(라운드로빈 소유자 확장 버그 수정) 완료 후 재측정~~ — 완료. 시나리오 2를 같은 하네스로 재실행한
  before/after 비교표를 위 "2-후속" 절에 추가했다(측정 2026-07-25).
