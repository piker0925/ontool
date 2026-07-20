# ADR-0029 오피스 문서 변환기 확장 (HWP/HWPX/PPTX/레거시 doc·xls·ppt) — LibreOffice headless 백엔드

## 상태

확정 (2026-07-20)

## 배경

`.scratch/v2-feature-list.md` §10에서 HWP 뷰어는 "무조건 편입" 확정, 단 렌더링 방식은 `/research`(hwp.js vs hwplib 품질 비교) 선행 후 결정하기로 유보돼 있었다.

조사 결과:
- **hwp.js**(github.com/hahnlee/hwp.js) — 클라이언트 렌더 라이브러리. npm 마지막 배포 2020-10, 마지막 커밋 2024-04로 사실상 방치. **HWPX(신규 XML 기반 포맷)를 아예 못 읽음**, 레거시 바이너리 HWP만 대상. 이미지 포함 문서에서 파싱 실패하는 오픈 이슈(#88, 2025-12) 존재.
- **hwplib**(github.com/neolord0/hwplib) — 활발히 유지보수되지만(2026-07-13 커밋) 자바 객체 모델 라이브러리일 뿐, README에 PDF/이미지/HTML 변환 **미지원을 명시** — 렌더러가 아니라 뷰어로 쓸 수 없다. HWPX는 별도 프로젝트(hwpxlib)가 필요.
- 결론: 순수 JS/자바 라이브러리로 hwp+hwpx를 동시에 정확히 렌더링하는 가벼운 방법이 생태계에 없다. 실질적 대안은 **LibreOffice headless + H2Orestart 확장**(HWP/HWPX 임포트를 지원하는 커뮤니티 확장, 활발히 유지보수) 조합으로 PDF 변환뿐이다.

추가로 확인된 사실:
- 기존 문서 뷰어(073, `DocumentViewerTool.vue`)는 100% 프론트 로컬(docx-preview/SheetJS)로 **OOXML(.docx/.xlsx)만** 읽는다. 2007 이전 레거시 바이너리(.doc/.xls/.ppt)와 PPTX는 이 뷰어로 커버되지 않는 사각지대다.
- 아키텍처 제약: `ToolPage.vue`는 툴 단위로 frontend-only(`isFrontendOnly`) vs Heavy(Job/Worker) 경로를 분기한다. 한 툴이 파일 종류에 따라 반은 클라이언트 렌더, 반은 서버 변환으로 나뉠 수 없다 — 따라서 LibreOffice 경로는 기존 `document-viewer`에 끼워넣는 게 아니라 **별도 Heavy 모듈**이 된다.
- `back/Dockerfile`에 영상 모듈(037) 때문에 이미 `apt-get install ffmpeg`가 있다 — 네이티브 바이너리 셸아웃 자체는 이번이 처음이 아니다. 다만 LibreOffice는 이미지 용량·빌드 시간 부담이 ffmpeg보다 훨씬 크다.
- 사용자 판단: 무거운 의존성(LibreOffice)을 배포에 얹는 비용을 어차피 치른다면, HWP 전용으로 좁히지 말고 **기존 클라이언트 뷰어가 못 읽는 모든 오피스 문서의 백업 변환기**로 스코프를 넓혀 비용 대비 이득을 키우기로 확정.

## 결정

**신규 Heavy 모듈 도입, LibreOffice headless + H2Orestart 확장으로 PDF 변환.**

- 지원 입력 포맷: HWP, HWPX, PPTX, 레거시 DOC/XLS/PPT. (ODT/ODS/ODP는 국내 수요 낮아 이번 스코프 제외)
- 처리: `soffice --headless --convert-to pdf` (H2Orestart 확장으로 HWP/HWPX 임포트 지원) → 기존 Job/Worker/FileStorage 파이프라인으로 결과 PDF 저장.
- 결과 표시: 커스텀 PDF 뷰어를 만들지 않는다 — 073에서 이미 "브라우저가 PDF를 네이티브로 렌더링해 커스텀 뷰어 이득이 없다"고 판단한 것과 동일 논리. 새 탭으로 열거나 다운로드만 제공.
- `back/Dockerfile`에 LibreOffice + H2Orestart 확장 설치 스텝 추가 필요(ffmpeg와 동일하게 apt 기반, 단 이미지 용량 증가폭이 큼 — 감수).
- 결과 품질은 "베타" 라벨 고지 — 레거시 포맷 특성상 표·이미지 등 레이아웃 불완전 가능성.
- 기존 `document-viewer`(DOCX/XLSX 즉시 렌더)는 그대로 유지, 신규 포맷은 별도 툴로 등록.
- **UI/UX**: 사용자 요청으로 뷰어 계열 전반의 사용성 보강 포함 — 업로드 파일의 감지된 포맷을 배지로 표시, 즉시 렌더(기존 document-viewer)와 변환 대기(신규 Heavy 모듈, 기존 `HeavyJobStatusPanel` 재사용) 흐름을 시각적으로 구분, 변환 완료 시 결과 PDF 새 탭 열기 버튼 + 다운로드 버튼, 베타 라벨 노출.

## 재검토 조건

- LibreOffice 변환 실패율/렌더 품질 문제가 실사용에서 과도하게 관측되는 경우
- 배포 이미지 크기·빌드 시간이 실제 운영에 문제가 되는 경우(예: 무료/저사양 호스팅 한도 초과)

## 결과

설계만 확정된 상태 — 구현은 이슈로 분리해 착수(`.scratch/issues/094-office-document-converter.md`). 실제 apt 패키지명·H2Orestart 설치 절차·변환 명령·동시 실행 처리 방식은 이슈 작업 중 `/research` 또는 구현 과정에서 검증한다.

## 구현 완료 후 추가 기록 (2026-07-20, 094 구현 중 확정)

- **Lane 결정**: `Lane.HEAVY`(기본값) 재사용으로 확정, 전용 Lane 신설 안 함. 근거 — `LibreOfficeConvertSupport`가 인보케이션마다 `-env:UserInstallation`으로 프로필을 격리해 동시 변환 2건이 충돌 없이 각각 성공하는 것을 테스트로 실증(`OfficeDocumentConvertModuleTest#동시_변환_요청_두_건이_프로필_충돌_없이_각각_성공한다`). 영상처럼 코어를 오래 점유하는 인코딩이 아니라 문서 변환은 초 단위로 끝나 전용 Lane(동시 1개 제한)까지는 필요 없다고 판단.
- **이미지 용량 증가 실측**(`docker history` 레이어별 크기): LibreOffice(writer/calc/impress/java-common)+fonts-noto-cjk+curl 레이어 **542MB**, H2Orestart 확장 레이어 **844KB**(무시할 수준). 비교 대상인 ffmpeg 레이어는 **426MB** — LibreOffice가 ffmpeg 대비 약 27% 더 무겁지만 같은 자릿수. 최종 이미지 총량 2.08GB(ffmpeg+LibreOffice+JRE+앱 전부 포함).
- **H2Orestart 필요성 실증**: 컨테이너에서 확장을 제거한 뒤 동일 `test.hwpx`로 변환 시도 → `Error: source file could not be loaded`로 완전히 실패(PDF 생성 자체가 안 됨). 확장 재설치 후 정상 변환 확인. 즉 HWPX는 H2Orestart 없이는 LibreOffice가 아예 열지 못한다.
- **손상 파일 에러 시나리오 조정**: 당초 "손상된 파일 업로드 시 에러"를 상정했으나, 실제로는 LibreOffice가 순수 랜덤 바이트까지도 텍스트로 강제 해석해 "성공"으로 변환해버리는 것을 확인(레거시 포맷의 관대한 임포트 동작 — 베타 라벨의 근거가 되는 사실이기도 함). 진짜 실패 경계는 입력 파일 자체를 읽을 수 없는 경우였다 — 테스트를 이 경계에 맞춰 작성.
- **non-root 컨테이너 이슈**: `spring` 유저의 기본 홈이 `/nonexistent`라 H2Orestart 내부 로거·dconf·fontconfig 캐시가 권한 에러를 냈다(변환 자체는 성공하지만 로그가 지저분함). `adduser --home /app`으로 해결.
