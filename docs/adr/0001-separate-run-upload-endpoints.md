# ADR-0001 가벼운/무거운 도구 엔드포인트 분리

## 상태
확정

## 배경
`POST /api/v1/tools/{moduleId}/run` 하나로 가벼운 도구(텍스트 입력)와 무거운 도구(파일 업로드)를 모두 처리하는 방안을 검토했다.

## 검토한 선택지

| 안 | 방식                             |
|---|--------------------------------|
| A | 단일 엔드포인트, Content-Type으로 분기    |
| B | 엔드포인트 분리 (`/run` vs `/upload`) |
| C | 단일 엔드포인트, 항상 multipart         |

## 결정
**B — 엔드포인트 분리**

```
POST /api/v1/tools/{moduleId}/run    → 가벼운 도구 (application/json)
POST /api/v1/tools/{moduleId}/upload → 무거운 도구 (multipart/form-data)
```

## 이유

1. **HTTP 프로토콜 제약** — `application/json`은 바이너리 파일 전송에 부적합하다. 파일을 base64로 인코딩해 JSON에 담으면 50MB 파일이 66MB가 되고 서버 메모리도 폭발한다.

2. **Spring MVC 제약** — `@RequestBody`(JSON)와 `@RequestPart`(multipart)는 한 메서드에서 공존할 수 없다. 억지로 합치면 컨트롤러 코드가 비자연스러워진다.

3. **현업 관례** — Stripe(`POST /v1/files`), GitHub, Google Drive 모두 파일 업로드는 별도 엔드포인트를 사용한다.

4. **단일 책임** — 각 엔드포인트가 하나의 역할만 담당해 테스트와 문서화가 단순해진다.

## 결과
- `GET /api/v1/modules` 응답의 `isHeavy` 필드로 프론트가 어느 엔드포인트를 호출할지 판단한다.
- 클라이언트 부담이 증가하지 않는다.
