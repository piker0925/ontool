# ADR-0006 테스트 전략

## 상태
확정

## 배경
레이어별로 어떤 테스트를 어떤 방법으로 작성할 것인지 결정해야 한다.
H2 인메모리 DB는 우리 프로젝트의 `SELECT FOR UPDATE SKIP LOCKED`(MySQL 8+ 전용)와 JSON 컬럼을 지원하지 않아 탈락했다.

## 검토한 전략

| 전략            | 설명                      | 장점               | 단점                        |
|---------------|-------------------------|------------------|---------------------------|
| A. 테스트 피라미드   | 단위 > 슬라이스 > 통합. 레이어별 분리 | 빠른 피드백, 실패 원인 명확 | Mock 많아 실제 동작과 괴리. 코드량 많음 |
| B. 테스트 트로피    | 통합 중심. Mock 최소화         | 실제 동작에 가장 가까움    | 느림. 실패 원인 찾기 어려움          |
| C. 핵심만 (실용주의) | 반드시 필요한 것만              | 구현에 집중. 핵심은 다 검증 | 커버리지 낮음                   |

## 결정
**C. 핵심만 (실용주의) + Awaitility**

포트폴리오에서 모든 레이어를 완벽하게 테스트하는 것은 비현실적이다.
구현이 먼저이고, 핵심 검증은 아래 3가지로 충분하다.

### 반드시 테스트

**① ToolModule — JUnit5 + 실제 파일**
```java
// src/test/resources/samples/sample.jpg 등 테스트 파일 준비
@Test
void imageResizeShouldProduceCorrectDimensions() {
    ToolResult result = imageResizeModule.process(input);
    assertThat(result.isFile()).isTrue();
    // 출력 파일 존재 + 포맷 확인
}
```
- 이유: PDFBox, Thumbnailator가 JDK 25와 실제로 호환되는지 검증이 핵심. Mock 대체 불가.
- Mock: 없음

**② JobRepository — @DataJpaTest + Testcontainers MySQL 8**
```java
@Testcontainers
@DataJpaTest
@AutoConfigureTestDatabase(replace = NONE)
class JobRepositoryTest {
    @Container
    static MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.0");
    // SKIP LOCKED, JSON 컬럼, 집계 쿼리 검증
}
```
- 이유: Native Query(`SKIP LOCKED`)와 JSON 컬럼은 H2에서 검증 불가.
- 컨테이너: static 선언으로 전체 테스트가 하나의 컨테이너 공유 (속도 최적화)

**③ Worker 전체 흐름 — @SpringBootTest + Testcontainers + Awaitility**
```java
@Test
void pendingJobShouldBecomeCompleted() {
    Job job = createPendingJob();
    await().atMost(10, SECONDS)
        .until(() -> jobRepository.findById(job.getId())
            .get().getStatus() == DONE);
}
```
- 이유: 업로드 → 폴링 → 상태 전환 전체 흐름 검증. Happy path 1개.
- Mock: FileStorage (파일 실제 저장 불필요)
- Thread.sleep 대신 Awaitility로 flaky test 방지

### 선택적 테스트 (시간이 남으면)
- JobController: `@WebMvcTest` — URL 매핑, 에러 응답 포맷
- JobService: Mockito — 배치/단건 분기 로직

### 테스트하지 않는 것
- 표준 JPA `findById`, `save`
- getter/setter, Lombok 생성 코드
- `@Scheduled`, `@Async` 스프링 빈 와이어링 자체
- LocalFileStorage 별도 테스트 (Worker 통합에서 커버)

## 결과
- 우선순위: ToolModule → Repository → Worker 통합 → (선택) Controller
- Testcontainers 의존성 추가 필요 (`testcontainers-mysql`)
- Awaitility 의존성 추가 필요

## 추가 — 커버리지 게이트와 제외 정책 (2026-07-20)

이후 백엔드에 JaCoCo가 도입되어 `check`에 라인 커버리지 최소 80% 검증이 물렸다(실측 92%). 이 임계값을 유지하되, 다음 두 부류는 리포트·게이트 계산에서 제외한다 — "테스트가 없다"가 아니라 "이 방식으로는 측정 자체가 안 된다"는 뜻이라 숫자에 남기면 오히려 오해를 부른다.

- **프레임워크 진입점** (`*Application.class` 등): `main()`은 모든 `@SpringBootTest`가 부트스트랩 과정에서 암묵적으로 검증. 스프링 부트 프로젝트의 일반적 관례.
- **도구가 구조적으로 계측 못 하는 클래스** (예: JEP 418 DNS 리졸버 SPI처럼 JVM 부트스트랩 단계에서 로드되는 클래스): 테스트는 실제로 존재하고 통과해야 하며, 제외 이유는 반드시 `build.gradle.kts`에 인라인 주석으로 남긴다. 패키지 단위가 아니라 클래스를 하나씩 나열 — 와일드카드는 그 패키지의 진짜 미검증 클래스까지 가릴 수 있다.

프론트엔드(`front/`)에는 `@vitest/coverage-v8`로 리포트만 도입했고 게이트는 아직 없다 — 실측치를 몇 차례 지켜본 뒤 임계값 도입 여부를 재검토한다. 계측 오버헤드로 타이밍에 민감한 테스트가 산발적으로 기본 타임아웃(5000ms)을 넘겨 `test.testTimeout`을 10000ms로 올렸다 — vitest에 `--coverage` 전용 타임아웃 훅이 없어 coverage 없는 일반 `pnpm test`에도 같이 적용된다. 로컬에서 2회 연속 통과를 확인했지만 표본이 적어 완전히 배제된 건 아니다 — CI 도입 시 재확인 필요.

세부 구현: `.scratch/issues/092-coverage-gate-cleanup.md`
