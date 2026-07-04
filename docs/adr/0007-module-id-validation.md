# ADR-0007 모듈 ID 검증 방식

## 상태
확정

## 배경
URL 경로의 `{moduleId}` (`"image-to-pdf"` 등)가 유효한 모듈인지 검증하는 방식을 결정해야 한다.

## 검토한 선택지

| 방식 | 설명 |
|------|------|
| A. Enum + @JsonValue | Enum 내부에 문자열 값 포함. 직렬화/역직렬화 변환 필요 |
| B. 문자열 상수 클래스 | `ModuleId.IMAGE_TO_PDF` 상수로 관리 |
| C. 빈 조회 검증 | 등록된 ToolModule 빈을 Map으로 모아 moduleId로 조회 |

## 결정
**C. 빈 조회 검증**

```java
@Service
public class ToolService {
    private final Map<String, ToolModule> modules;

    public ToolService(List<ToolModule> moduleList) {
        this.modules = moduleList.stream()
            .collect(toMap(ToolModule::getId, m -> m));
    }

    public ToolModule findModule(String moduleId) {
        return Optional.ofNullable(modules.get(moduleId))
            .orElseThrow(() -> new AppException(ErrorCode.MODULE_NOT_FOUND));
    }
}
```

## 이유

1. **A 제외**: 외부 클라이언트에게 타입 안정성을 제공할 때 유용하지만, 우리 모듈은 내부에서 관리된다. Enum 수정과 모듈 구현이 두 곳에서 동기화되어야 하는 부담이 있다.

2. **B 제외**: 상수 클래스와 ToolModule 구현체가 별도로 관리된다. 모듈 추가 시 두 곳을 수정해야 한다.

3. **C 선택**: 새 모듈 추가 시 `@Component`만 붙이면 자동 등록된다. 코드 한 곳만 수정. 오타는 즉시 `MODULE_NOT_FOUND`로 명확하게 실패한다. ToolModule 인터페이스의 `getId()`가 이미 있으므로 추가 구조 없이 자연스럽게 확장된다.

## 결과
- 모듈 추가: `@Component` 추가 → 자동 등록. Enum/상수 수정 불필요
- 유효하지 않은 moduleId → `AppException(MODULE_NOT_FOUND)` → 404 응답
- URL 경로 문자열 (`"image-to-pdf"`)이 `ToolModule.getId()` 반환값과 일치해야 함
