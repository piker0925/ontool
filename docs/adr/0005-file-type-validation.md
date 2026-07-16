# ADR-0005 파일 타입 검증 방식

## 상태
확정

## 배경
모듈마다 허용 파일 타입이 다르다 (이미지 모듈: JPG/PNG/WebP, PDF 모듈: PDF).
업로드 시점에 타입을 검증해야 한다.

## 검토한 선택지

| 방식                                | UX (즉시 차단)        | 보안 | 인터페이스 순수성 | 복잡도 |
|-----------------------------------|-------------------|----|-----------|-----|
| A. 확장자만 / Controller              | ✅                 | ❌  | ✅         | 낮음  |
| B. ToolModule.getSupportedTypes() | ✅                 | ❌  | ❌         | 중간  |
| C. ToolModule 내부에서 검증             | ❌ (큐 진입 후 FAILED) | ❌  | ✅         | 낮음  |
| D. 매직 바이트 (Apache Tika)           | ✅                 | ✅  | ✅         | 높음  |
| E. Service 상수 + 확장자               | ✅                 | ❌  | ✅         | 낮음  |

## 결정
**확장자 + Content-Type 병행 검증. Service에서 모듈별 허용 타입 상수로 관리.**

```java
// 모듈별 허용 타입 상수
private static final Map<String, Set<String>> ALLOWED_TYPES = Map.of(
    "image-to-pdf",  Set.of("image/jpeg", "image/png", "image/webp"),
    "image-resize",  Set.of("image/jpeg", "image/png", "image/webp"),
    "image-format",  Set.of("image/jpeg", "image/png", "image/webp", "image/gif"),
    "gif-create",    Set.of("image/jpeg", "image/png", "image/webp"),
    "pdf-merge",     Set.of("application/pdf"),
    "pdf-split",     Set.of("application/pdf")
);

// JobService.createJob()에서 업로드 즉시 검증
String contentType = file.getContentType();
String ext = getExtension(file.getOriginalFilename());
if (!isAllowed(moduleId, contentType, ext)) {
    throw new AppException(ErrorCode.UNSUPPORTED_FILE_TYPE);
}
```

## 이유

1. **C 제외**: 검증이 큐 진입 후에 실패한다. 사용자가 나중에 FAILED를 보는 UX가 나쁘다.
2. **B 제외**: ToolModule 인터페이스에 메타데이터 책임을 추가한다. `process()`만 담당해야 한다.
3. **D 제외**: Apache Tika 50MB 의존성 추가, 검증 시간 증가. 인증 없는 포트폴리오 서비스에서 과한 보안이다.
4. **확장자 + Content-Type 병행**: 확장자만 체크하면 `virus.exe → image.jpg` 조작에 취약하다. Content-Type은 브라우저가 자동 설정하므로 둘 다 일치할 때만 통과시키면 악의적 조작의 대부분을 막는다.
5. **인터페이스 순수성 유지**: ToolModule은 `process()`만 담당. 허용 타입은 Service 상수로 분리.

## 결과
- 모듈 추가 시 `ALLOWED_TYPES`에 항목 추가 필요 (단순 Map 업데이트)
- ToolModule 인터페이스 변경 없음
- 매직 바이트 검증은 보안 요구사항이 높아지면 그때 Apache Tika 도입
