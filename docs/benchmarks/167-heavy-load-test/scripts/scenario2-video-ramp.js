// 이슈 167 — VIDEO 레인(permit=1) 고정 동시성 부하 — 램프업 곡선의 "한 점"을 만드는 스크립트.
// scenario1(HEAVY)와 분리·오케스트레이션 방식은 그쪽 파일 주석 참고(레인별 permit이 달라 병목이 다름,
// ramping-vus 대신 TARGET_VUS 고정 + run-ramp.sh 반복 실행으로 동시성별 표 행을 깔끔히 분리).
import { Trend, Counter } from 'k6/metrics';
import { submitJob, pollUntilDone } from './lib.js';

const videoSample = open('./fixtures/sample.mp4', 'b');

export const jobCompletionTime = new Trend('job_completion_time', true);
export const submitFailures = new Counter('submit_failures');
export const pollFailures = new Counter('poll_failures');

const TARGET_VUS = parseInt(__ENV.TARGET_VUS || '1', 10);
const DURATION = __ENV.DURATION || '10s';

export const options = {
  scenarios: {
    video_flat_load: {
      executor: 'constant-vus',
      vus: TARGET_VUS,
      duration: DURATION,
    },
  },
  thresholds: {
    job_completion_time: ['p(95) < 60000'],
  },
};

export default function () {
  const owner = `video-vu${__VU}`;
  const submit = submitJob('video-to-gif', owner, videoSample, 'sample.mp4');
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
