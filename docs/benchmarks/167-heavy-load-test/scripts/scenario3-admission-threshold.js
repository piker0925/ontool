// 이슈 167 — Admission Control 발동 임계점(503 QUEUE_FULL / 507 STORAGE_FULL) 탐색.
// 103의 시나리오4/4b(bash, "거부가 발생한다"만 확인)를 k6로 재현하되, "몇 번째 요청·큐 적재 몇 건째부터
// 거부되는지" 정확한 수치를 낸다.
//
// 사전 조건(README "재현 방법"에 명시, run-admission-threshold.sh가 안내):
//   - MODE=queue: 백엔드를 --scheduling.worker.delay=3600000로 재기동(워커 정지 — PENDING이 안 빠져야
//     "몇 번째에서 거부되는가"가 결정적으로 재현된다, 103과 동일 이유)
//   - MODE=disk : 백엔드를 --storage.disk-budget-bytes=<작은 값>으로 재기동
//
// pending_before를 DB 직접 조회 없이 계산하는 이유: reset_jobs로 0에서 시작하고, 이 스크립트가 유일한
// 제출자(VU 1)이며 워커가 멈춰 있거나(MODE=queue) 이 게이트가 워커 처리와 무관하게 즉시 거부하므로
// (MODE=disk), 매 요청 전 PENDING 수는 정확히 "지금까지 성공(202)한 제출 수"와 같다. k6 OSS는 SQL
// 드라이버가 없어(xk6-sql 커스텀 빌드는 신규 의존성이라 이슈 스펙과 안 맞음) 이 방식이 자연스럽다.
//
// 결과를 handleSummary로 파일에 직접 쓰려고 시도했으나, k6는 VU 실행 컨텍스트와 handleSummary
// 컨텍스트 사이에 모듈 스코프 상태를 공유하지 않는다(별도 JS 런타임 인스턴스) — 실측으로 확인함
// (admissionResult가 handleSummary에서 항상 null). 그래서 103과 동일하게 CSV 한 줄씩 stdout에 찍고
// run-admission-threshold.sh가 grep으로 뽑는 방식을 쓴다 — k6 로그 포맷(logfmt)은 따옴표가 없는
// 순수 CSV 값은 이스케이프하지 않으므로 안전하다.
import { submitJob } from './lib.js';

const MODE = __ENV.MODE || 'queue';
const MODULE_ID = MODE === 'queue' ? 'video-to-gif' : 'image-resize';
const SAMPLE_PATH = MODE === 'queue'
  ? './fixtures/sample.mp4'
  : '../../../../back/src/test/resources/samples/test.png';
const FILE_NAME = MODE === 'queue' ? 'sample.mp4' : 'test.png';
const MAX_ATTEMPTS = parseInt(__ENV.MAX_ATTEMPTS || '20', 10);

const sample = open(SAMPLE_PATH, 'b');

export const options = { vus: 1, iterations: 1 };

export default function () {
  console.log('ATTEMPT_CSV_HEADER request_index,pending_before,http_status');

  let rejectedAtIndex = null;
  let rejectedHttpStatus = null;

  for (let i = 1; i <= MAX_ATTEMPTS; i++) {
    const pendingBefore = i - 1;
    const submit = submitJob(MODULE_ID, 'admission-probe', sample, FILE_NAME);
    console.log(`ATTEMPT_CSV ${i},${pendingBefore},${submit.status}`);
    if (!submit.ok) {
      rejectedAtIndex = i;
      rejectedHttpStatus = submit.status;
      break;
    }
  }

  console.log(`ADMISSION_SUMMARY mode=${MODE} moduleId=${MODULE_ID} rejectedAtIndex=${rejectedAtIndex} rejectedHttpStatus=${rejectedHttpStatus}`);
}
