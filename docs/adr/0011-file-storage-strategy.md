# ADR-0011 파일 스토리지 추상화 전략

## 상태
확정

## 배경
Heavy 모듈의 처리 결과 파일(PDF, 이미지 등)을 어디에 저장하고 어떻게 클라이언트에게 전달할지 결정해야 한다.
로컬 개발 환경과 운영 환경(Oracle Cloud)의 조건이 다르다.

## 검토한 선택지

| 방식 | 설명 | 문제점 |
|------|------|------|
| A. AWS S3 | 업계 표준 오브젝트 스토리지 | 유료. 포트폴리오 단계에서 비용 발생 |
| B. Cloudinary | 이미지/파일 CDN + 무료 플랜 | 무료 플랜 25GB. 충분함 |
| C. 로컬 디스크 | 서버 디스크에 파일 저장 | 운영 서버 재시작 시 파일 소멸. 확장성 없음 |
| D. 로컬(개발) + Cloudinary(운영) | 환경별 전략 분리 | 인터페이스 추상화 필요하지만 유연함 |

## 결정
**D. FileStorage 인터페이스 추상화 + 환경별 구현체**

```java
public interface FileStorage {
    void   save(String key, Path file);   // key = "{jobId}/result.{ext}"
    String getUrl(String key);            // URL 생성 (로컬: http://..., Cloudinary: https://...)
    void   delete(String key);
}

@Profile("local")
class LocalFileStorage implements FileStorage { ... }

@Profile("prod")
class CloudinaryFileStorage implements FileStorage { ... }
```

- **로컬**: `uploads/{key}` 디렉토리에 저장. `GET /api/v1/files/**`로 서빙.
- **운영**: Cloudinary 무료 플랜 업로드. CDN URL 반환.

## 이유

**S3 제외**: 포트폴리오 단계에서 비용을 지불할 이유가 없다.

**Cloudinary 선택**: 무료 플랜(25GB, 25만 변환/월)이 이 서비스 규모에 충분하다. SDK가 단순하고, CDN URL을 바로 제공해 별도 파일 서빙 로직이 운영에서 불필요하다.

**인터페이스 추상화**: 운영 환경에서 저장소를 바꿔야 할 때 Worker와 Service 코드를 수정하지 않아도 된다. `@Profile`로 빈만 교체.

## 결과
- Job.result_key: Cloudinary public_id 또는 로컬 상대 경로
- 로컬: `FileController`가 `GET /api/v1/files/**` 서빙
- 운영: Cloudinary SDK가 CDN URL 반환 → 클라이언트가 직접 다운로드
- Job 만료(`expires_at`) 시 `FileStorage.delete()` 호출로 파일 정리
