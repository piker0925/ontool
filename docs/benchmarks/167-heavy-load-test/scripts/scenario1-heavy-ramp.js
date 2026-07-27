// 이슈 167 — HEAVY 레인(permit=2) 고정 동시성 부하 — 램프업 곡선의 "한 점"을 만드는 스크립트.
// scenario2(VIDEO)와 별도 파일로 분리한 이유: 레인마다 permit이 달라(HEAVY=2, VIDEO=1) 포화 지점이
// 다르다 — 같은 실행에 섞으면 어느 레인이 병목인지 해석 불가(이슈 원문 명시).
//
// 램프업 곡선(1→5→10→20→40 VU) 전체를 k6 ramping-vus 하나로 묶지 않고, TARGET_VUS로 동시성을
// 고정해 이 스크립트를 여러 번(run-ramp.sh가 오케스트레이션) 실행하는 방식을 택했다 — ramping-vus
// 하나로 합치면 스테이지 경계 근처에 걸친 job이 어느 동시성 수준에 속하는지 애매해져서, 103·ADR-0036이
// 이미 정한 "표로 보고" 원칙에 맞는 깔끔한 동시성별 표 행을 만들기 어렵다.
import { Trend, Counter } from 'k6/metrics';
import { submitJob, pollUntilDone } from './lib.js';

const imageSample = open('../../../../back/src/test/resources/samples/test.png', 'b');

export const jobCompletionTime = new Trend('job_completion_time', true);
export const submitFailures = new Counter('submit_failures');
export const pollFailures = new Counter('poll_failures');

const TARGET_VUS = parseInt(__ENV.TARGET_VUS || '1', 10);
const DURATION = __ENV.DURATION || '10s';

export const options = {
  scenarios: {
    heavy_flat_load: {
      executor: 'constant-vus',
      vus: TARGET_VUS,
      duration: DURATION,
    },
  },
  thresholds: {
    // 이슈 스펙 문서화용 기준값 — 실측 후 README에 실제 p95/p99을 그대로 기록(임계값 통과 여부가
    // 목적이 아니라 곡선 자체가 목적이므로, 여기서 실패해도 측정은 계속 유효하다).
    job_completion_time: ['p(95) < 60000'],
  },
};

export default function () {
  const owner = `heavy-vu${__VU}`;
  const submit = submitJob('image-resize', owner, imageSample, 'test.png');
  if (!submit.ok) {
    submitFailures.add(1);
    console.error(`submit failed: status=${submit.status} body=${submit.body}`);
    return;
  }

  const result = pollUntilDone(submit.jobId, jobCompletionTime);
  if (result.status !== 'DONE') {
    pollFailures.add(1);
    console.error(`job ${submit.jobId} ended with status=${result.status} after ${result.elapsedMs}ms`);
  }
}
