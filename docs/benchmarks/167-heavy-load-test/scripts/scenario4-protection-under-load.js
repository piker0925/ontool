// 이슈 167 — 과부하 중 다른 소유자 보호 확인.
// 한 소유자(flooder)가 VIDEO 레인을 과부하시켜 admission control에 거부당하는 동안, 다른 소유자
// (victim)가 다른 레인(HEAVY)에 제출한 요청은 여전히 수용·처리되는지 확인한다 — "과부하가 시스템
// 전체를 마비시키지 않는다"는 근거(이슈 원문).
//
// 왜 레인을 분리했나: AdmissionControl.checkQueueDepth는 레인별로 독립된 임계값(queue.max-pending
// .video=10, .heavy=200)을 본다 — 레인 전체를 보는 게이트지 소유자별 게이트가 아니다. flooder와
// victim이 같은 레인이면 victim도 거부돼 "다른 소유자는 보호되는가"를 아예 검증할 수 없다(레인 자체가
// 이미 거부 상태라 owner 구분이 무의미) — 이건 스코프 축소가 아니라 시스템 동작상 강제되는 설계다.
// 이 테스트가 증명하는 건 "레인 격리"이지 "시스템 전체의 우아한 성능 저하" 전반이 아니다 — README에
// 과장해서 쓰지 않는다.
//
// 왜 http.batch()로 "동시 제출"을 만드나(설계 변경 이력): 처음엔 flood 루프가 첫 거부를 본 뒤 곧바로
// victim을 순차 제출 → 곧바로 VIDEO를 한 번 더 찔러 "여전히 거부 중"인지 확인하는 3단계 순차 구조였다.
// 실제로 로컬에서 돌려보니 victim 처리(수백 ms) 사이에 VIDEO 워커(permit=1)가 이미 작업 하나를 비워
// "여전히 거부 중" 확인이 false로 나왔다 — 거부 윈도우가 순차 흐름의 지연(HTTP 왕복+폴링)보다 짧을 수
// 있다는 뜻이다. 그렇다고 애초의 k6 concurrent scenarios + 고정 startTime 방식(더 이전 버전)으로
// 되돌리면 원격 실행에서 타이밍이 달라져 "공허한 통과"(둘 다 우연히 통과했지만 실제로는 안 겹쳤을 수도
// 있는)로 되돌아간다. http.batch()는 한 VU 안에서 여러 요청을 진짜 동시에(같은 이벤트 루프 틱에) 보내고
// 응답을 기다리므로, "victim이 수용된 바로 그 순간에도 VIDEO가 거부 중이었다"를 타이밍 추측 없이
// 결정적으로 증명한다 — 벽시계 타이밍이 아니라 같은 batch 호출이라는 구조로 동시성을 보장한다.
import http from 'k6/http';
import { Trend } from 'k6/metrics';
import { BASE_URL, submitJob, pollUntilDone } from './lib.js';

const videoSample = open('./fixtures/sample.mp4', 'b');
const imageSample = open('../../../../back/src/test/resources/samples/test.png', 'b');

const MAX_FLOOD_ATTEMPTS = parseInt(__ENV.MAX_FLOOD_ATTEMPTS || '30', 10);

export const victimCompletionTime = new Trend('victim_completion_time', true);

export const options = { vus: 1, iterations: 1 };

export default function () {
  // 1) 선행 플러딩 — VIDEO 레인을 첫 거부가 나올 때까지 순차로 채운다(이 단계는 "겹침"이 필요 없다,
  // 목적은 그냥 큐를 임계값 이상으로 채워두는 것뿐).
  let floodRejectedAtIndex = null;
  for (let i = 1; i <= MAX_FLOOD_ATTEMPTS; i++) {
    const submit = submitJob('video-to-gif', 'flooder', videoSample, 'sample.mp4');
    console.log(`FLOOD_CSV ${i},${submit.status}`);
    if (!submit.ok) {
      floodRejectedAtIndex = i;
      break;
    }
  }
  console.log(`FLOOD_SUMMARY rejectedAtIndex=${floodRejectedAtIndex}`);
  if (floodRejectedAtIndex === null) {
    console.error(`flood never rejected within ${MAX_FLOOD_ATTEMPTS} attempts — MAX_FLOOD_ATTEMPTS too low, test inconclusive`);
    return;
  }

  // 2) "동안에도" 검증 — victim(HEAVY)과 VIDEO 재확인 probe를 같은 batch로 진짜 동시에 보낸다.
  const batchRes = http.batch({
    victim: {
      method: 'POST',
      url: `${BASE_URL}/api/v1/tools/image-resize/upload`,
      body: { files: http.file(imageSample, 'test.png') },
      params: { headers: { 'X-Client-Id': 'victim' } },
    },
    probe: {
      method: 'POST',
      url: `${BASE_URL}/api/v1/tools/video-to-gif/upload`,
      body: { files: http.file(videoSample, 'sample.mp4') },
      params: { headers: { 'X-Client-Id': 'flooder' } },
    },
  });

  const victimRes = batchRes.victim;
  const probeRes = batchRes.probe;
  const victimAccepted = victimRes.status === 202;
  const probeStillRejected = probeRes.status !== 202;
  console.log(`CONCURRENT_SUMMARY victimStatus=${victimRes.status} victimAccepted=${victimAccepted} probeStatus=${probeRes.status} probeStillRejected=${probeStillRejected}`);

  // 3) victim이 실제로 끝까지 처리되는지는 이후 시점에서 확인한다 — 이 폴링 구간에는 VIDEO가
  // 이미 정상으로 돌아왔어도 상관없다(2단계에서 이미 "동시 순간"의 격리는 증명됐다).
  if (victimAccepted) {
    const jobId = JSON.parse(victimRes.body).jobId;
    const result = pollUntilDone(jobId, victimCompletionTime);
    console.log(`VICTIM_SUMMARY submitStatus=${victimRes.status} outcome=${result.status} elapsedMs=${result.elapsedMs}`);
  } else {
    console.log(`VICTIM_SUMMARY submitStatus=${victimRes.status} outcome=REJECTED elapsedMs=0`);
  }
}
