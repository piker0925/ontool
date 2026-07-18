# ADR-0021 IP 기반 Rate Limiting — Heavy 업로드 엔드포인트

## 상태
확정 (2026-07-15)

## 요약 (TL;DR)

`POST /api/v1/tools/{id}/upload`(Heavy 진입점, `/run`은 Heavy를 거부하므로 대상 아님)에 IP당 고정 윈도우 카운터 기반 rate limit을 건다. 이 프로젝트는 시험용(실사용 트래픽 미확정)이라, 목표는 결정된 공격자 방어나 정교한 남용 탐지가 아니라 **DoS급 폭주만 걸러내는 최소 안전망** — 정상적인 사용 패턴은 한도 근처에도 가지 않을 만큼 넉넉하게 잡는다. [[project_devtoolbox_admin_cors_fix]]와 마찬가지로 실제 위협 모델에 맞춘 최소 구현이라는 원칙은 유지한다.

- **알고리즘**: 고정 윈도우 카운터(IP당 60초에 기본 200회 — 초당 평균 ~3.3회, `AdmissionControl`의 `queue.max-pending.heavy` 기본값과 같은 크기로 맞춤), Bucket4j 등 신규 의존성 없이 이미 있는 Guava `Cache`(`expireAfterAccess`)로 비활성 IP 자동 만료.
- **클라이언트 IP 판정**: `X-Real-IP` 헤더 우선 신뢰, 없으면 `RemoteAddr` 폴백. `X-Forwarded-For`는 사용하지 않는다.
- **알려진 한계**: 백엔드 8080 포트가 nginx를 거치지 않고 직접 노출돼 있어(`docker-compose.prod.yml`), 이 경로로 직접 요청하는 클라이언트는 임의의 `X-Real-IP`를 보내 한도를 우회하거나 다른 IP를 뒤집어씌울 수 있다. 결정된 공격자에겐 방어되지 않음 — 아래 "알려진 한계" 절 참조.

## 배경

040 이슈: 여러 사용자가 동시에 여러 파일을 업로드할 때, 한 사용자(혹은 재시도 루프에 걸린 클라이언트)의 대량 요청이 큐를 독점해 다른 사용자가 무한정 대기하거나, 디스크/큐 용량(036, `AdmissionControl`)을 소진시킬 수 있다는 우려에서 출발했다. `AdmissionControl`은 "시스템 전체 용량"을 감시하는 앞단 거부이고, 이 ADR은 "클라이언트 하나가 얼마나 자주 두드리는지"를 감시하는 별도 층위다 — 같은 "문 앞 거절" 패턴이지만 판정 기준이 다르다.

## 클라이언트 IP 판정 — X-Real-IP를 신뢰하는 이유

nginx 설정(`nginx/nginx.conf`)은 다음을 설정한다:

```
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```

`X-Real-IP`는 `set`이므로 nginx가 **항상 실제 접속 IP로 덮어쓴다** — 클라이언트가 이 헤더에 뭘 보내든 nginx를 거치면 무시되고 실제 IP로 교체된다. 반면 `X-Forwarded-For`는 `$proxy_add_x_forwarded_for`(기존 값에 **append**)라 클라이언트가 보낸 첫 값이 그대로 남는다 — 즉 `X-Forwarded-For: 9.9.9.9`를 보내면 `9.9.9.9, <진짜 IP>`가 되고, 순진하게 "첫 값"을 신뢰하면 그대로 스푸핑당한다. 그래서 이 ADR은 `X-Forwarded-For`가 아니라 `X-Real-IP`를 신뢰 소스로 채택한다.

## 알려진 한계 — 백엔드 포트 직접 노출

`docker-compose.prod.yml`은 backend 컨테이너를 `8080:8080`으로 호스트에 직접 바인딩한다. nginx(80/443)뿐 아니라 이 포트로도 외부에서 직접 도달 가능하다면(실제 도달 가능 여부는 OCI 보안 목록에 달려 있고 이 저장소 안에서는 확인 불가), 클라이언트가 nginx를 완전히 건너뛰고 백엔드에 직접 요청하면서 임의의 `X-Real-IP`를 실어 보낼 수 있다 — 이 경우 이 rate limiter는 무력화되거나(자기 IP를 계속 바꿔가며 우회), 다른 클라이언트의 IP를 사칭해 그 IP를 부당하게 차단시키는 것도 가능하다.

이 한계는 **결정된 공격자**에게만 유효하다 — 040의 목표(우발적 남용 방지)엔 영향이 없으므로 이번 작업 범위에서 고치지 않는다. 근본 수정은 `docker-compose.prod.yml`에서 backend의 `ports: - "8080:8080"` 매핑을 제거하는 것(nginx는 같은 compose 네트워크에서 `backend:8080`으로 도달 가능해 호스트 포트 노출이 애초에 불필요) — 별도 인프라 변경이 필요해 이 ADR의 범위 밖에 남겨둔다.

## 왜 이중 윈도우(분당+시간당)가 아니라 단일 고정 윈도우인가

이슈 초안은 "분당 N회 / 시간당 M회"를 함께 검토했다. 그러나 위협 모델이 우발적 남용(짧은 폭주)이지 지속적 공격이 아니므로, 두 번째(시간 단위) 윈도우가 잡아낼 추가 위협이 실질적으로 없다 — IP별 카운터를 두 개 관리하는 복잡도만 늘어난다. 단일 윈도우(60초당 200회)로 충분하다고 판단했다.

## 추록 (2026-07-18, 관리자 로그인 브루트포스 방어)

관리자 `/admin/**` Basic Auth에 IP별 실패 잠금(`AdminLoginAttemptTracker`)을 추가하면서 `ClientIpResolver`를 그대로 재사용했다 — 위 "알려진 한계"(백엔드 8080 포트 직접 노출 시 `X-Real-IP` 스푸핑 가능)를 이 기능도 동일하게 물려받는다. 새로운 위험이 아니라 기존에 이미 받아들인 한계의 연장이고, 위협 모델도 동일하다(우발적/스크립트성 시도 방어, 결정된 공격자 방어는 범위 밖). 근본 수정(호스트 포트 매핑 제거)이 이뤄지면 두 기능 모두 한 번에 해소된다.

카운팅 방식은 `RateLimiter`와 다르다 — "실패만 기록"(`recordFailure`)과 "요청마다 확인하되 기록 안 함"(`isLockedOut`)이 분리돼 있어야 해서(정상 폴링·성공한 로그인이 잠금 카운트를 소모하면 안 됨) `RateLimiter`를 재사용하지 않고 같은 Guava 고정 윈도우 패턴으로 별도 컴포넌트(`AdminLoginAttemptTracker`)를 뒀다. IP 판정 소스(`ClientIpResolver`)만 공유한다.

## 왜 Bucket4j가 아니라 직접 구현인가

Bucket4j를 쓰든 직접 구현하든, 이 컴포넌트는 `AdmissionControl`(036, 상태 없는 정적 판정)과 달리 **IP별 상태를 들고 있어야** 한다는 점에서 두 가지 위험이 새로 생긴다: (a) 만료 없는 맵은 고유 IP가 쌓일수록 메모리 누수, (b) 시간 기반 로직을 `sleep` 없이 결정론적으로 테스트하려면 시계 주입이 필요하다. 이 두 가지는 라이브러리를 쓰든 안 쓰든 반드시 직접 처리해야 하므로, 라이브러리 도입 여부는 "얼마나 코드가 줄어드는가"로만 판단했다. 이미 의존성에 있는 Guava의 `CacheBuilder.expireAfterAccess()` + `Ticker` 주입으로 (a)(b) 모두 신규 의존성 없이 해결 가능해, Bucket4j를 새로 추가하지 않았다.

## 설계

- `RateLimiter`(`global/ratelimit/RateLimiter.java`): 고정 윈도우 카운터. `@Value`로 한도(기본 200)·윈도우(기본 60초) 설정. 내부적으로 `Guava Cache<String, WindowCounter>`(`expireAfterAccess = 윈도우 × 2`)에 IP별 (윈도우 시작 시각, 카운트)를 보관. 판정(`checkLimit`)은 `AdmissionControl`과 동일하게 정적 순수 메서드.
- `ClientIpResolver`(`global/ratelimit/ClientIpResolver.java`): `X-Real-IP` 우선, 없으면 `RemoteAddr` 폴백.
- `ToolController.upload()`에서 배치든 단건이든 루프 진입 전 1회만 `rateLimiter.assertNotLimited(...)` 호출 (036의 `admissionControl.assertCapacityAvailable` 호출과 동일한 위치·패턴).
- 초과 시 `ErrorCode.RATE_LIMITED` → 429 + `ErrorResponse` JSON, 메시지는 "요청이 너무 많습니다. 1분 후 다시 시도해 주세요."(윈도우가 60초이므로 "1분 후"는 실제 리셋 시점과 근사적으로 일치). `Retry-After` 헤더는 추가하지 않음(아래 참조).

## Retry-After 헤더를 넣지 않은 이유

이슈 초안은 "429 + Retry-After 헤더 고려"라고 여지를 남겼다. 정확한 `Retry-After` 값을 주려면 "이 IP의 윈도우가 언제 끝나는지"를 `RateLimiter`가 예외 밖으로 노출해야 하는데, 이는 `GlobalExceptionHandler`의 "새 `ErrorCode` 추가는 핸들러 변경 불요" 관례를 깨고 이 예외만 특별 취급하는 새 구조가 필요하다. 메시지 자체에 윈도우 길이와 맞춘 구체적 안내("1분 후")를 담아 사용자가 언제 재시도할지 감을 잡을 수 있으므로, 초 단위 정밀도가 주는 한계효용 대비 구조 변경 비용이 크다고 판단해 생략했다.

## Acceptance criteria 반영

- 429 + `ErrorResponse` JSON: `ToolControllerRateLimitTest.한도를_넘으면_429로_거부하고_Job을_만들지_않는다`
- 2-액터 격리(한 IP 초과가 다른 IP에 영향 없음): `RateLimiterTest.다른_IP는_서로_영향을_주지_않는다`, `ToolControllerRateLimitTest.한_IP가_한도를_넘어도_다른_IP는_영향받지_않는다`
- nginx 프록시 시 클라이언트별 IP 분리(뭉치지 않음): `ClientIpResolverTest` — `X-Real-IP` 우선 사용 검증
- 한도 내 정상 사용자는 보호됨: `RateLimiterTest.한도_이내면_통과한다` + 윈도우 리셋 테스트
