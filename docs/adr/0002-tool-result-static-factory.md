# ADR-0002 ToolResult 정적 팩토리 패턴

## 상태
확정

## 배경
`ToolModule.process()`의 반환 타입 `ToolResult`가 두 가지 경우를 표현해야 한다.
- 무거운 도구 (5개): 결과 파일 경로 (`Path`)
- 가벼운 도구 — 백엔드 처리 (SHA-256 1개): 텍스트 결과 (`String`)

## 검토한 선택지

| 안 | 방식                                                                       |
|---|--------------------------------------------------------------------------|
| A | null 허용 record — `ToolResult(Path outputFile, Map<String, String> data)` |
| B | sealed interface — `ToolResult.File` / `ToolResult.Data`                 |
| C | 정적 팩토리 + 헬퍼 메서드                                                          |

## 결정
**C — 정적 팩토리 패턴**

```java
public record ToolResult(Path outputFile, String textResult) {

    public static ToolResult ofFile(Path path) {
        return new ToolResult(path, null);
    }

    public static ToolResult ofText(String text) {
        return new ToolResult(null, text);
    }

    public boolean isFile() { return outputFile != null; }
}
```

## 이유

1. **백엔드 가벼운 모듈이 SHA-256 1개뿐** — sealed interface는 1개를 위해 전체 인터페이스 계층을 복잡하게 만든다. 과한 설계다.

2. **A의 문제** — `Map<String, String>` 안에 `{"hash": "abc..."}` 형태가 어색하고, null 직접 체크 시 NPE 위험이 있다.

3. **C의 이점** — 정적 팩토리(`ofFile`, `ofText`)로 생성 의도가 명확하다. `isFile()` 헬퍼로 분기가 가독성 있다. null은 내부로 숨겨져 외부로 노출되지 않는다.

## 결과
- 무거운 모듈: `return ToolResult.ofFile(outputPath);`
- SHA-256: `return ToolResult.ofText(hash);`
- 호출자: `if (result.isFile()) { ... } else { ... }`
