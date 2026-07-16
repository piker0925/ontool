# ADR-0010 관리자 인증 방식

## 상태
확정

## 배경
통계 페이지(`/admin/stats`)는 본인만 볼 수 있어야 한다.
이 서비스에는 User 테이블이 없고, 일반 사용자 인증도 없다.

## 검토한 선택지

| 방식                 | 설명                        | 문제점                                         |
|--------------------|---------------------------|---------------------------------------------|
| A. JWT             | 발급 엔드포인트 + 토큰 검증          | User 테이블, 로그인 API, 토큰 관리 필요. 관리자 1명을 위해 과도함 |
| B. 세션 기반 로그인       | Spring Security formLogin | 로그인 페이지, 세션 스토어 필요. 역시 과도함                  |
| C. HTTP Basic Auth | 브라우저 기본 인증 팝업             | 설정 한 줄. 관리자 1명 전용으로 충분                      |
| D. IP 화이트리스트       | 특정 IP만 허용                 | 배포 환경 변경 시 설정 바꿔야 함. 불편함                    |

## 결정
**C. Spring Security HTTP Basic Auth**

```yaml
spring:
  security:
    user:
      name: admin
      password: ${ADMIN_PASSWORD}
```

`/admin/**` 경로에만 적용. 나머지 경로는 permitAll.

## 이유

관리자가 1명(본인)이고, 기능이 통계 조회 하나다.
JWT나 세션은 이 요구사항에 비해 구현 비용이 너무 크다.
HTTP Basic Auth는 Spring Security 설정 몇 줄로 완성되고, HTTPS 환경에서는 보안 수준도 충분하다.

비밀번호는 yml에 하드코딩하지 않고 환경변수(`${ADMIN_PASSWORD}`)로 주입.

## 결과
- `SecurityConfig.java`: `/admin/**` → authenticated, 나머지 → permitAll
- `application-prod.yml`: `ADMIN_PASSWORD` 환경변수 참조
- User 테이블, 로그인 API, 토큰 발급 로직 불필요
