# ADR-0025 Flyway 도입 — 운영 DB 스키마 버전 관리

## 상태

확정 (2026-07-17) — 구현 전 (v2 2차 선행 작업). CONTEXT.md 기술 스택의 "DB 마이그레이션: JPA ddl-auto, Flyway 불필요" 결정을 대체한다.

## 배경

엔티티 4개(Job·Comment·ToolStats·Suggestion) 시절에는 `ddl-auto`(로컬 create-drop / 운영 update)로 충분했다. v2는 사정이 다르다:

- **운영 중인 DB에 연쇄 스키마 변경**이 들어간다: `user`·`refresh_token`·개인화 테이블 신설, `job.user_id`·`comment.user_id` 추가 (ADR-0024).
- `ddl-auto update`는 컬럼·테이블 추가만 가능하다. 제약 추가, 이름 변경, 데이터 백필은 못 하고, 무엇이 언제 적용됐는지 기록이 없으며, 실패 시 중간 상태로 남는다.
- 운영 DB가 이미 존재하는 지금이 baseline을 잡을 적기다 — 더 미루면 "어디까지가 V1인가"부터 복잡해진다.

## 결정

**Flyway를 도입한다. 운영·CI는 마이그레이션 스크립트가 스키마의 유일한 진실이 된다.**

- `V1__baseline.sql` — 현재 운영 스키마 전체를 baseline으로 고정. 기존 운영 DB에는 `baseline-on-migrate`로 V1을 건너뛰고 이후 버전부터 적용.
- 이후 모든 스키마 변경은 `back/src/main/resources/db/migration/V{n}__*.sql` 버전 스크립트로만.
- **버전 번호는 병합(머지) 시점에 부여한다** — 이슈·브랜치에서 미리 번호를 선점하지 않는다. 병행 개발된 브랜치 두 개가 각자 번호를 박으면, 낮은 번호가 늦게 배포될 때 Flyway 기본 설정(`outOfOrder=false`)에서 기동이 실패한다. 규칙: 브랜치에서는 `V?__설명.sql`처럼 자리만 잡고, main에 병합하는 순간 "현재 main의 최대 번호 + 1"로 확정. `outOfOrder=true`는 켜지 않는다(적용 순서의 예측 가능성이 더 중요).
- **운영(prod)**: `ddl-auto=validate` + Flyway 실행. JPA가 스키마를 건드리지 않고 엔티티-스키마 불일치를 기동 시점에 잡는다.
- **로컬(local)**: `create-drop` 유지 — 엔티티 반복 수정이 잦은 개발 흐름을 막지 않는다.
- **드리프트 방지**: 로컬(create-drop)과 운영(Flyway)이 갈라지지 않도록, Testcontainers 기반 테스트 하나가 "빈 MySQL에 Flyway 전체 적용 → `ddl-auto=validate`로 컨텍스트 기동"을 검증한다. 엔티티만 고치고 마이그레이션을 빠뜨리면 CI가 실패한다.

## 기각한 대안

- **ddl-auto update 유지** — 백필·제약이 필요한 변경마다 VM에서 수동 SQL 실행. 기록이 없고 재현 불가.
- **로컬까지 Flyway 통일** — 개발 중 엔티티 수정마다 스크립트를 쓰는 마찰이 큼. 드리프트는 위의 CI 테스트로 잡는 편이 싸다.

## 결과 (예상)

- `build.gradle.kts`에 `flyway-mysql` 추가.
- 운영 배포 시 백엔드 기동이 곧 마이그레이션 적용 — 별도 배포 단계 불필요.
- "운영 중인 서비스에 로그인 스키마를 무중단으로 얹는 마이그레이션"이 포트폴리오 서사로 남는다.
