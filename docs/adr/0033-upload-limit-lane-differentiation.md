# ADR-0033 업로드 한도 레인 차등화 + 디스크 조기청소

## 상태
확정 및 구현 완료 (2026-07-21, 106)

## 요약 (TL;DR)

`spring.servlet.multipart` 업로드 한도(032가 50MB/100MB로 정함)를 레인(ADR-0019)별로 차등화한다. VIDEO 레인(ffmpeg 서브프로세스, Path 기반 I/O — JVM 힙에 안 올라감)은 파일당 1GB/요청당 2GB로 크게, HEAVY 레인(이미지·PDF, 디코드가 힙을 씀)은 50MB를 유지한다. 한도를 올리면서 결과·입력 파일 청소(`TtlCleanupScheduler`)를 그대로 두면 TTL 창(prod 1시간) 안에 디스크 예산(036, 10GB)이 스스로 소진돼 트래픽이 있을 때 오히려 507이 잦아지므로, 디스크 사용량이 8GB(80%)를 넘으면 오래된 완료 작업을 조기 만료시키는 로직을 함께 둔다.

## 배경

video-metadata에 몇 분짜리 영상을 올리면 50MB 한도에 걸려 413이 났다(실사용 보고, 2026-07-21). 032가 "영상 감안해" 한도를 올렸다고 적었지만, 실제로는 모든 모듈에 동일한 50MB를 적용해 스스로 세운 목표를 충족하지 못했다.

## 근거 조사 — 레인마다 힙 위험이 다르다

032/036 코드 주석은 한도 근거를 "결과가 아직 in-memory로 처리되므로"라고 적었는데, 실제 코드를 확인하면 이 근거는 모듈군마다 다르게 적용된다:

- `ToolController.saveFiles`는 `MultipartFile.transferTo()`로 디스크에 스트리밍 — 업로드 수신 자체는 모든 모듈 공통으로 힙을 안 쓴다.
- **영상 모듈 7개**(`VideoMetadataModule`, `VideoTrimConvertModule`, `VideoToGifModule`, `VideoToAudioModule`, `VideoFrameExtractModule`, `VideoWatermarkModule`, `VideoMergeModule`)는 `ProcessBuilder`+`FfmpegSupport`/`FfprobeSupport`로 ffmpeg를 외부 프로세스로 돌리고 `Path`만 주고받는다 — 파일 크기가 JVM 힙에 스케일되지 않는다.
- **PDF 모듈 5개**(`PdfPasswordModule`, `PdfSplitModule`, `PdfWatermarkModule`, `PdfHeaderFooterModule`, `ImageToPdfModule`)는 `PDDocument.load(File)`을 쓰는데, PDFBox 2.x는 `MemoryUsageSetting`을 명시하지 않으면 기본값이 `setupMainMemoryOnly()`라 스크래치 메모리가 힙에 올라간다. **이미지 모듈**(`BufferedImage`/`ImageIO`/Thumbnailator)도 디코드 시 힙을 쓴다.

즉 힙 위험은 HEAVY 레인(이미지·PDF)의 실재하는 속성이고, VIDEO 레인엔 애초에 적용되지 않는 근거였다. 하나의 캡으로 묶은 게 설계 오류였다.

## 배포 스펙 대조 — 한도를 올려도 안전한가

ADR-0019 물리 제약: VM.Standard.A1.Flex 2 OCPU/12GB. `back/Dockerfile`은 `-Xmx`를 지정하지 않아 JVM 기본 `MaxRAMPercentage`(25%) 적용 시 힙 ≈ 3GB. 실질 병목은 RAM이 아니라 디스크(10GB 예산, 036)·VIDEO 레인 동시성(1)·전송 시간이다. VIDEO 레인은 힙을 안 쓰므로 한도를 올려도 이 병목엔 영향이 없다.

## 결정 수치와 도출 근거

| 레인/항목 | 값 | 도출 근거 |
|---|---|---|
| VIDEO 파일당 | 1GB | 1080p(~8Mbps) 약 17분, 4K(~35Mbps) 약 3~4분 분량 — 포트폴리오 데모 용도로 충분. 디스크 예산(10GB)의 10% 수준이라 단일 파일이 예산을 위협하지 않음 |
| VIDEO 요청당(배치, merge·watermark) | 2GB | 파일당 값의 2배. `VideoMergeModule`/`VideoWatermarkModule`만 `acceptsMultipleFiles()=true`라 한 요청에 여러 클립이 묶임 |
| HEAVY(이미지·PDF) | 50MB 유지 (안 올림) | 근거 조사에서 확인된 실재하는 힙 위험. 상향하려면 PDFBox `MemoryUsageSetting.setupTempFileOnly()` 전환이 선행돼야 함(107, 스코프 미확정). 실사용 문서(계약서·리포트 등)는 대부분 수 MB~20MB라 50MB로 이미 충분 |
| 디스크 조기청소 상한선(high-water mark) | 8GB (80%, 버퍼 2GB) | "감으로 85%"가 아니라 **청소 주기(60초, `scheduling.ttl.delay`) × 최악의 동시 유입량**으로 역산: 레인 동시성 제한(VIDEO=1)은 "처리" 단계에만 적용되고 "업로드 수락" 단계엔 없어(`AdmissionControl.assertCapacityAvailable`은 요청 시작 시 1회 검사, TOCTOU 여지), 60초 안에 2GB짜리 VIDEO 배치 요청 2~3건이 동시에 들어올 수 있다고 가정 → 버퍼 2GB 필요 |

이 값들은 영구 확정이 아니다 — 조기청소 트리거 발동을 로그로 남겨 운영 데이터로 재조정하는 것을 전제로 한다.

## ADR-0019 §4("하드 캡 없음")와의 관계 — 다른 축

ADR-0019 §4는 "입력 크기에 하드 캡을 두지 않는다"고 명시했는데, 이건 사용자별 **in-flight 작업 개수 쿼터**(기본 200) 얘기다. 이 ADR이 다루는 **파일 크기 캡**(032가 처음 도입, 여기서 레인별로 차등화)과는 다른 축이며 서로 모순되지 않는다 — "몇 개까지 동시에 큐에 넣을 수 있는가"와 "파일 하나가 얼마나 클 수 있는가"는 독립적인 질문이다.

## `getLane()`이 아니라 `getUploadSizeLane()`을 새로 둔 이유 — 처리 동시성과 크기 위험은 다른 축

최초 구현은 레인 판정에 기존 `ToolModule.getLane()`(ADR-0019, 처리 동시성용)을 그대로 재사용했다. 그런데 `VideoMetadataModule`은 ffprobe만 써서 가벼우니 **동시성은 일부러 HEAVY 레인**을 쓴다(VIDEO 레인은 동시 1개뿐이라 아까움 — ADR-0019 시절부터의 의도된 설계). `getLane()`만 보고 업로드 크기를 판정하면 이 모듈이 "영상이라 힙 위험 없음"(위 근거 조사에 명시)에도 불구하고 조용히 HEAVY 50MB 캡에 걸린다 — 실제로 이 ADR 적용 직후 실사용에서 발생한 회귀(2026-07-21, 64MB 영상이 413으로 거부됨).

그래서 `ToolModule`에 `default Lane getUploadSizeLane() { return getLane(); }`을 추가했다. 기본값은 `getLane()`과 같아 대부분의 모듈(이미지·PDF·영상 인코딩 모듈들)은 두 값이 일치하지만, `VideoMetadataModule`만 `getUploadSizeLane()`을 `VIDEO`로 오버라이드해 **처리 동시성(HEAVY)과 업로드 크기 판정(VIDEO)을 분리**한다. `getLane()`은 ADR-0019의 스케줄러·큐 관련 코드(`JobService`, `LaneLimiter`, `AdmissionControl`의 큐 깊이 게이트 등)에서 계속 그대로 쓰이고, 업로드 크기 판정 코드(`ToolController`의 재검증, `/api/v1/modules` 응답)만 `getUploadSizeLane()`으로 바꿨다.

## Rejected 대안

- **청크/재개형 업로드(tus), 오브젝트 스토리지 직접 업로드**: 단일 VM·포트폴리오 스코프에서 엔지니어링 비용 대비 과설계. 기각.
- **글로벌 multipart 한도만 일괄 상향(레인 구분 없이)**: 이미지·PDF도 같이 커져 힙 위험이 실재하는 모듈에 불필요한 위험을 얹음. 기각.
- **한도만 올리고 조기청소는 안 함**: TTL 창(1시간) 안에 예산이 자체 소모돼 트래픽이 있을 때 오히려 507이 잦아짐. 기각.
- **서버가 Content-Length만 보고 조기 거부**: 브라우저가 이미 body 전송을 시작한 뒤라 클라이언트 쪽 대기 자체는 못 줄임. 클라이언트 사전검증(프론트, 아래 참조)이 유일하게 "0바이트 전송"을 보장.

## 설계

- 컨테이너(서블릿) 레벨 `spring.servlet.multipart.max-file-size`/`max-request-size`는 모든 레인 중 가장 큰 값(VIDEO, 1GB/2GB)으로 열어둔다. 레인별 실제 한도는 `ToolController.upload()`가 `module.getUploadSizeLane()` 기준으로, 디스크 쓰기(`saveFiles`) 전에 가장 싸게 재검증한다(`upload.max-file-size-bytes.{heavy,video}` 등, `queue.max-pending.*`와 동일한 설정 패턴).
- nginx `client_max_body_size`는 Spring 요청 한도(2GB)보다 살짝 높게(2200M) 동반 상향 — "Spring 한도보다 높여 정상 초과가 Spring까지 도달해 JSON 413이 나가게 한다"는 032의 원칙 유지.
- `TtlCleanupScheduler.cleanup()`은 기존 "만료된 Job 정리" 단계 이전에 디스크 사용량을 확인해, 8GB를 넘으면 완료(DONE/FAILED) 작업을 `createdAt` 오름차순으로 조기 만료(`Job.expireNow()`)시켜 같은 틱에 회수되게 한다.
- `/api/v1/modules`가 모듈별 실제 업로드 한도를 내려주고, 프론트(`FileUploader`)는 이 값을 읽어 선택 즉시(네트워크 왕복 없이) 오버사이즈 파일을 걸러낸다 — 하드코딩 금지.

## Acceptance criteria 반영

- 레인별 파일 크기 재검증(HEAVY 60MB 거부 / VIDEO 60MB 통과): `ToolControllerUploadSizeLimitTest`
- 처리 레인(HEAVY)과 업로드 크기 레인(VIDEO)이 다른 모듈도 올바르게 판정(위 회귀 재발 방지): `ToolControllerUploadSizeLimitTest.처리_레인은_HEAVY지만_업로드_크기_레인이_VIDEO인_모듈은_VIDEO_한도를_따른다`, `VideoMetadataModuleTest.처리_레인은_HEAVY지만_업로드_크기_기준은_VIDEO다`
- `/api/v1/modules` 모듈별 한도 노출(HEAVY/VIDEO 다른 값): `ToolControllerModuleLimitsTest`
- 디스크 조기청소(상한선 초과 시 가장 오래된 완료 작업만 조기 만료, 새 작업은 보존): `TtlCleanupSchedulerEvictionTest`
- 프론트 서버 구동 한도(하드코딩 제거) + 업로드 진행률(정적 스피너 대신 실제 %): `FileUploader.test.ts`, `fileSizeLimit.test.ts`

## 관련
- 이슈 106(구현 작업 목록·완료 기준), 107(PDFBox 스크래치 메모리 디스크화, HEAVY 상향의 선행 조건 — 스코프 미확정)
- 032(원래 50MB/100MB 도입), 036(디스크 예산 게이트), ADR-0019(레인 개념 정의)
