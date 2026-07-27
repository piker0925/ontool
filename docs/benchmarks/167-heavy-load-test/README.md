# Heavy 큐 부하테스트 — 처리량·지연시간·용량 한계 실측 (이슈 167)

## 목적

103(Heavy 큐 공정성 벤치마크)은 "라운드로빈 공정 스케줄링이 작동하는가"(정성적 로직 검증)와
"admission control이 거부를 발동하는가"(정성적)만 다뤘고, 문서 자체가 "절대 처리량(jobs/min)은
스코프 밖"이라고 명시했다(로컬 노트북과 운영 Ampere A1이 하드웨어가 달라 절대 수치가 신뢰되지
않는다는 이유). 즉 "이 시스템이 실제로 몇 명 동시 사용자·몇 건 동시 요청까지 견디는가"를 보여주는
정량적 부하테스트는 아직 없었다.

**167의 목적**: 어느 동시성 수준에서 admission control이 거부를 발동하는가(정량적 임계점)와,
거부 이전 구간의 처리량·지연시간이 어떤 곡선을 그리는가(캐파시티 곡선)를 실측한다.

**103과의 역할 분리(중복 금지)**: 103의 공정성·소유자 편향 시나리오는 여기서 재현하지 않는다.
103은 "거부가 작동하는가"를 이미 증명했고, 167은 "어느 지점에서 한계에 부딪히는가"를 찾는다.

## 환경

측정 환경 결정(로컬 개발 + 실제 배포 VM 1회 실측)의 전체 근거는
[ADR-0037](../../adr/0037-167-load-test-measurement-environment.md) 참고. 요약:

- `--cpus` 같은 로컬 컨테이너 제한만으로는 운영 Oracle Ampere A1(2 OCPU)과 절대 처리량이 맞지
  않는다(코어 개수만 맞고 클록 속도는 못 맞춤) — 그래서 k6 스크립트 로직은 로컬에서 개발·검증하고,
  최종 절대 수치는 실제 배포 VM에서 1회만 측정한다.
- 로컬 검증 환경: 103과 별도로 격리된 벤치마크 전용 MySQL(`devtoolbox-bench167-mysql`, 포트 3308,
  DB `devtoolbox_bench167`) + 백엔드(포트 8167, `local,local-benchmark` 프로파일).
- 원격 실측 환경: 실제 배포 VM에 arm64 GHCR 이미지(`ghcr.io/piker0925/devtoolbox-backend`)를 pull해
  운영과 분리된 포트(8167)·DB(`devtoolbox-bench-mysql`)·네트워크(`devtoolbox-bench-net`)로 임시
  컨테이너 기동, k6는 로컬에서 SSH 터널(`-L 8167:localhost:8167`)로 접속해 실행. 측정 후 임시
  컨테이너·네트워크·볼륨은 전부 정리했다(운영 `devtoolbox-nginx`/`-backend`/`-mysql`는 영향 없음
  확인).

## 도구

- **k6**(Breakpoint test 방법론 — [k6 공식 문서](https://grafana.com/docs/k6/latest/testing-guides/test-types/breakpoint-testing)).
  신규 의존성은 로컬 CLI 설치만 필요.
- **JFR**(JDK 내장) — 병목의 근본 원인(GC·CPU·락 경합) 진단용. Prometheus/Grafana를 안 쓰는 이유는
  [ADR-0036](../../adr/0036-observability-scope-jfr-over-prometheus.md) 참고.

## 스크립트 구성

| 파일 | 역할 |
|---|---|
| `scripts/lib.js` | 공용 헬퍼 — `submitJob`(업로드), `pollUntilDone`(완료까지 폴링 + `Trend` 기록). 비동기 큐라 k6 기본 `http_req_duration`(제출 응답시간)은 "job이 등록됐다"는 뜻일 뿐 처리 완료가 아니므로, 종단간 완료 지연시간은 이 헬퍼로 직접 잰다. |
| `scripts/scenario1-heavy-ramp.js` | HEAVY 레인(permit=2) 고정 동시성 부하 1건 — 램프업 곡선의 "한 점". `TARGET_VUS`/`DURATION` 환경변수로 동시성 고정. |
| `scripts/scenario2-video-ramp.js` | VIDEO 레인(permit=1) 버전. 레인을 분리한 이유: permit이 달라 포화 지점이 다르므로, 섞으면 병목 해석이 불가능(이슈 원문 명시). |
| `scripts/run-ramp.sh` | scenario1/2를 동시성 1→5→10→20→40 VU로 반복 실행해 램프업 곡선(동시성별 표 행)을 만든다. `ramping-vus` 하나로 안 합친 이유: 스테이지 경계에 걸친 job이 어느 동시성 수준에 속하는지 애매해져 깔끔한 표를 못 만든다. |
| `scripts/scenario3-admission-threshold.js` | Admission control 발동 임계점(503 QUEUE_FULL / 507 STORAGE_FULL) 탐색. `MODE=queue`\|`disk`. 103의 시나리오4/4b("거부가 발생한다"만 확인)를 "몇 번째 요청에서 거부되는가" 정량화로 확장. |
| `scripts/run-admission-threshold.sh` | scenario3 실행 wrapper. 실행 전 백엔드를 `MODE`에 맞는 플래그로 재기동해야 한다(스크립트 상단 주석 참고). |
| `scripts/scenario4-protection-under-load.js` | 과부하 중 다른 소유자 보호 확인. 아래 "설계 변천사" 참고. |
| `scripts/run-protection.sh` | scenario4 실행 wrapper. |

## 재현 방법 (로컬 검증)

```bash
# 1. 벤치마크 전용 MySQL (103과 별도, 포트 3308)
docker run -d --name devtoolbox-bench167-mysql \
  -e MYSQL_DATABASE=devtoolbox_bench167 -e MYSQL_USER=devtoolbox -e MYSQL_PASSWORD=1234 \
  -e MYSQL_ROOT_PASSWORD=root -p 3308:3306 mysql:8.0

# 2. 백엔드 빌드 + 기동 (local-benchmark 프로파일)
cd back && ./gradlew bootJar -x test
java -jar build/libs/back-0.0.1-SNAPSHOT.jar \
  --server.port=8167 \
  --spring.profiles.active=local,local-benchmark \
  --spring.datasource.url="jdbc:mysql://localhost:3308/devtoolbox_bench167?serverTimezone=UTC&characterEncoding=UTF-8" \
  --storage.upload-dir=/tmp/devtoolbox-bench167-uploads

# 3. 램프업 (동시성별 표 행)
cd docs/benchmarks/167-heavy-load-test/scripts
LEVELS="1 5 10 20 40" DURATION=30s ./run-ramp.sh scenario1-heavy-ramp.js heavy
LEVELS="1 5 10 20 40" DURATION=30s ./run-ramp.sh scenario2-video-ramp.js video

# 4. Admission 임계점 — queue 모드는 워커 정지, disk 모드는 디스크 예산 축소로 백엔드 재기동 필요
#    (재기동 커맨드는 각 스크립트 상단 주석 참고)
./run-admission-threshold.sh queue
./run-admission-threshold.sh disk

# 5. 과부하 중 보호 확인 (일반 백엔드, 재기동 불필요)
./run-protection.sh
```

## scenario3·4 결과 (측정: 2026-07-26, 로컬)

> scenario3(admission 임계점)·scenario4(과부하 중 보호)는 워커를 정지시키거나 디스크 예산을
> 극단적으로 줄이는 등 결정적 재현이 목적이라, 하드웨어 절대 성능과 무관하다 — 그래서 로컬 실측만
> 하고 원격 재실행은 생략했다(103의 실측치와 정확히 일치해 교차검증도 이미 끝남). 하드웨어에 좌우되는
> 절대 처리량·지연시간(scenario1·2)은 아래 "원격 실측 결과" 절 참고.

### scenario3 — Admission Control 임계점

| 모드 | 거부 시점 | 거부 코드 | 비고 |
|---|---|---|---|
| queue (VIDEO 레인, 워커 정지, `--scheduling.worker.delay=3600000`) | **12번째 요청** (pending_before=11) | 503 QUEUE_FULL | 103의 실측치(12번째)와 정확히 일치 — 교차검증됨. VIDEO 레인의 큐 깊이 임계값(`queue.max-pending.video=10`) 기준 |
| disk (`--storage.disk-budget-bytes=1024`) | **2번째 요청** | 507 STORAGE_FULL | 103과 일치 |

queue 모드는 워커가 멈춰 있어 결정적으로 재현되는 수치다. 원본 데이터:
[`raw/admission-queue/attempts.csv`](raw/admission-queue/attempts.csv),
[`raw/admission-disk/attempts.csv`](raw/admission-disk/attempts.csv).

### scenario4 — 과부하 중 다른 소유자 보호

**증명 대상**: VIDEO 레인이 admission control로 거부 상태인 동안에도, 다른 소유자·다른 레인(HEAVY)의
요청은 여전히 수용·처리되는가 — "레인 격리"의 증거. `AdmissionControl.checkQueueDepth`가 레인별로
독립된 임계값을 보는 레인-글로벌 게이트라서, 같은 레인끼리는 이 시나리오 자체가 성립하지 않는다
(victim도 거부돼 "보호되는가"를 검증할 수 없음) — 그래서 레인을 분리했다. 이 결과가 증명하는 건
레인 격리이지 "시스템 전체의 우아한 성능 저하" 전반이 아니다.

**설계 변천사** (103의 "발견" 기록 관례를 따름 — 실제로 겪은 문제와 그 해결):

1. 처음엔 k6 concurrent scenarios(flood/victim을 `startTime` 오프셋으로 동시 실행)로 짰다.
   로컬에선 우연히 타이밍이 맞았지만, 원격 실행(SSH 터널 경유라 요청 지연이 달라짐)에서는 victim이
   VIDEO가 아직 과부하 상태가 아닐 때 도착해 "테스트는 통과했지만 아무것도 증명 못 한" 공허한 통과가
   날 수 있다는 문제가 지적됐다(ADR-0037처럼 원격 실측은 1회뿐이라 이 리스크를 감수할 수 없음).
2. 순차 3단계(플러딩→victim→VIDEO 재확인)로 바꿔 타이머 추측을 없앴다. 그런데 실제로 로컬에서
   돌려보니 victim 처리(수백 ms) 사이에 VIDEO 워커(permit=1)가 이미 슬롯 하나를 비워 "여전히 거부
   중" 확인이 `false`로 나왔다 — 거부 윈도우가 순차 흐름의 지연보다 짧을 수 있다는 실측 근거.
3. `http.batch()`로 victim 요청과 VIDEO 재확인 probe를 **같은 batch(진짜 동시)**로 보내도록 최종
   변경했다. 벽시계 타이밍이 아니라 "같은 batch 호출"이라는 구조로 동시성을 보장한다.

**로컬 실측 결과** (최종 `http.batch()` 버전):

| 항목 | 값 |
|---|---|
| flood가 VIDEO를 거부시킨 시점 | 12번째 요청 (503) |
| 같은 batch에서 victim(HEAVY) 결과 | **202 수용** |
| 같은 batch에서 VIDEO 재확인 probe 결과 | **503 — 여전히 거부 중** |
| victim 최종 처리 결과 | DONE, 2.55초 |

같은 순간에 한쪽(VIDEO)은 거부되고 다른 쪽(HEAVY)은 수용·완료됨을 동시성 경합 없이 확인했다.
원본 데이터: [`raw/protection/concurrent-summary.txt`](raw/protection/concurrent-summary.txt),
[`raw/protection/flood-attempts.csv`](raw/protection/flood-attempts.csv).

> 참고: scenario3(워커 정지)의 12번째는 결정적 수치지만, scenario4(워커 정상 동작)의 거부 시점은
> 워커가 동시에 큐를 비우고 있어 실행마다 달라질 수 있다 — "임계값에 도달했음"의 확인 용도로만
> 쓰고, 헤드라인 수치로 인용하지 않는다.

### scenario1·2 — 램프업 처리량/지연시간 곡선 (로컬 스모크)

로컬에서는 오케스트레이션이 동시성 레벨별로 정상적으로 도는지만 확인했다(스모크 테스트, 데이터는
실측치가 아니라서 보존하지 않음). 실제 수치는 아래 "원격 실측 결과" 절 참고.

## 원격 실측 결과 (측정: 2026-07-27, 실제 배포 VM 1회)

[ADR-0037](../../adr/0037-167-load-test-measurement-environment.md)에 따라 실제 배포 VM(Oracle
Ampere A1, 2 OCPU)에 격리된 컨테이너를 기동하고, k6는 Mac에서 SSH 터널로 접속해 실행했다.

> **JFR은 회수하지 못했다.** `-XX:StartFlightRecording=...,dumponexit=true`로 구성은 했으나,
> 컨테이너를 정상 종료(`docker stop`, 타임아웃 10초·30초 둘 다 시도)할 때마다 종료 코드가 143
> (SIGKILL이 아니라 SIGTERM 자체로 프로세스가 죽었다는 뜻)으로 찍히면서 `dumponexit` 훅이 파일에
> 아무것도 쓰지 못했다(0바이트) — 타임아웃 부족이 아니라 다른 원인으로 종료 절차 자체가 온전히
> 실행되지 못한 것으로 보이는데, 원인을 더 파려면 운영 서버에 추가 컨테이너 재기동이 필요해서
> 여기서 멈췄다. [ADR-0036](../../adr/0036-observability-scope-jfr-over-prometheus.md)에서 JFR은
> 애초에 선택 항목이라, 아래 결과는 k6 실측치만으로 정리한다.

### HEAVY 레인 (permit=2)

| 동시성(VUS) | 완료 job/min | job_completion p50 | p95 | 503(QUEUE_FULL) |
|---|---|---|---|---|
| 1  | 21.3 | 2.9s  | 3.2s  | 0 |
| 5  | 40.5 | 6.6s  | 11.9s | 0 |
| 10 | 40.5 | 14.9s | 19.6s | 0 |
| 20 | 40.6 | 26.7s | 35.9s | 0 |
| 40 | 40.0 | 26.2s | 54.9s | 0 |

원본: [`raw/heavy-ramp/`](raw/heavy-ramp/) (참고로 JFR 프로파일링 시도 중 VUS=40 지점만 별도로
재실행한 결과도 p95 52.6초로 거의 동일했다 — [`raw/heavy-jfr-probe-ramp/`](raw/heavy-jfr-probe-ramp/))

VUS=5부터 완료 처리량이 **분당 약 40건**에서 고정된다 — VUS를 5→40으로 8배 늘려도 처리량은
그대로고 대신 대기 지연(job_completion p95)만 12초→55초로 늘어난다. 전형적인 큐 포화 신호다:
permit=2인 HEAVY 레인은 동시에 2건만 처리하므로 그 이상의 요청은 줄을 선다. 다만
503(QUEUE_FULL) 거부는 테스트한 VUS 범위(≤40)에서 한 번도 발생하지 않았다 — HEAVY 레인의 큐 깊이
임계값(`queue.max-pending.heavy=200`)이 VIDEO 레인(`queue.max-pending.video=10`)보다 훨씬 높게
설정돼 있어, 40건이 거의 동시에 도착해도 pending 수가 200을 넘지 않기 때문이다. 이 차이는
permit 비율(2:1)에서 자동으로 유도된 게 아니라 레인별로 따로 설정한 정책 값이다
(`application.yaml`).

### VIDEO 레인 (permit=1)

| 동시성(VUS) | 완료 job/min | job_completion p50 | p95 | 503 거부 (제출 시도 대비) |
|---|---|---|---|---|
| 1  | 20.0 | 2.9s  | 3.2s  | 0 |
| 5  | 20.8 | 15.0s | 15.2s | 0 |
| 10 | 20.0 | 29.9s | 30.2s | 0 |
| 20 | 20.0 | 30.8s | 44.3s | 4,241 / 4,261 (99.5%) |
| 40 | 20.0 | 30.8s | 53.2s | 6,770 / 6,790 (99.7%) |

원본: [`raw/video-ramp/`](raw/video-ramp/)

VIDEO 레인은 VUS=1부터 이미 완료 처리량이 **분당 약 20건**(HEAVY의 정확히 절반 — permit=1이라
permit=2의 절반, 다만 이는 두 레인의 개별 작업 처리시간이 우연히 비슷해서 나온 결과이지 permit
비율에서 수학적으로 보장되는 값은 아니다)으로 고정돼 있고, VUS를 40까지 올려도 이 숫자는 변하지
않는다. HEAVY와 다른 점은 **VUS 10과 20 사이 어딘가에서 admission control이 개입해** 초과 요청을
큐잉 대신 즉시 503(QUEUE_FULL)으로 거부하기 시작한다는 것이다 — VIDEO 레인의 큐 깊이 임계값
(`queue.max-pending.video=10`)이 HEAVY(200)보다 훨씬 낮게 설정돼 있기 때문이다(scenario3에서
실측한 "12번째 요청 거부"도 이 VIDEO 기준값 기준이다). VUS=20에서 이미 제출 시도의 99.5%가
거부됐다(정확한 임계 VUS는 10과 20 사이로만 확인했고, 그 사이 값은 측정하지 않아 더 좁히지 않는다).
거부가 시작된 뒤에도 완료 처리량(분당 20건)과 수용된 job의 지연시간은 무한정 나빠지지 않고 p95
44~53초 선에서 유지된다 — admission control이 "받아준 요청은 계속 제때 처리되게" 초과분을 앞단에서
쳐내는 설계 의도대로 동작함을 보여준다.

## 캐파시티 요약

- **HEAVY(이미지 등)**: 분당 최대 약 40건. 초과 부하는 지연시간 증가로 흡수되고(최대 관측 p95
  55초), 테스트한 범위(VUS≤40)에서는 거부가 발생하지 않았다.
- **VIDEO(영상 변환 등)**: 분당 최대 약 20건. VUS 10~20 사이에서 admission control이 개입해
  초과 요청의 99% 이상을 즉시 거부로 전환하고, 거부 이후에도 수용된 요청의 지연시간은 무한정
  악화되지 않는다.
- 두 레인 모두 **처리량 상한이 동시 접속자 수와 무관하게 고정**돼 있다는 구조는 하드웨어와 무관한
  스케줄링·admission 설계의 결과다 — 사용자가 몇 명 몰리든 완료 처리량 자체는 permit 값(HEAVY=2,
  VIDEO=1) 비율을 따라가고, 초과분은 지연시간 증가나 즉시 거부로 흡수된다. 다만 **40건/20건이라는
  절대 수치 자체는 하드웨어에 좌우된다** — permit이 같아도 개별 작업 처리시간(이미지 리사이즈·영상
  트랜스코딩의 실제 CPU 소요)이 이 VM의 실제 성능에 달려 있기 때문이다. 로컬 `--cpus` 제한이 아니라
  실제 배포 VM에서 1회 실측한 이유([환경](#환경) 절, ADR-0037)가 바로 이 절대 수치를 위해서였다.

## 다음 단계

- [x] 원격 배포 VM에 격리 환경 기동(ADR-0037)
- [x] scenario1·2 램프업을 원격에서 실행해 캐파시티 곡선 확보
- [x] 측정 후 임시 컨테이너·네트워크·볼륨 정리(운영 컨테이너 영향 없음 확인)
- [ ] scenario3·4를 원격에서도 재실행해 로컬 결과와 교차검증 — 선택 사항으로 생략(로컬에서 이미
      103과 일치 확인됨, 재실행은 운영 서버에 불필요한 추가 부하)
- [ ] JFR로 램프업 중 병목 원인(GC/CPU) 프로파일링 — 시도했으나 최종 덤프 회수 실패, 선택 항목이라
      생략(위 "원격 실측 결과" 절 참고)
