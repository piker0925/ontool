// 이슈 167 — Heavy 큐 부하테스트 공용 k6 헬퍼.
// 비동기 큐이므로 k6 기본 http_req_duration(업로드 요청→응답)은 "job이 등록됐다"는 뜻일 뿐 처리 완료가
// 아니다. submitJob은 업로드만 하고, pollUntilDone이 GET /jobs/{id}를 폴링해 실제 완료(DONE/FAILED)까지
// 걸린 종단간 시간을 잰다 — 이 값을 호출부에서 Trend 커스텀 메트릭에 기록한다(k6 공식 패턴).
import http from 'k6/http';
import { sleep } from 'k6';

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:8167';

// moduleId에 파일을 업로드해 Job을 생성한다. fileBytes는 호출부가 init 컨텍스트에서 open(path, 'b')로
// 미리 읽어둔 값이어야 한다 — k6는 VU 코드 안에서 open()을 허용하지 않는다.
export function submitJob(moduleId, ownerId, fileBytes, fileName) {
  const res = http.post(
    `${BASE_URL}/api/v1/tools/${moduleId}/upload`,
    { files: http.file(fileBytes, fileName) },
    { headers: { 'X-Client-Id': ownerId } },
  );
  if (res.status !== 202) {
    return { ok: false, status: res.status, jobId: null, body: res.body };
  }
  const body = JSON.parse(res.body);
  return { ok: true, status: res.status, jobId: body.jobId, body: res.body };
}

// jobId가 DONE/FAILED가 될 때까지 GET /jobs/{id}를 폴링한다. 완료까지 걸린 시간(ms)과 최종 상태를 낸다.
// trend가 주어지면 성공(DONE) 케이스만 기록한다 — FAILED/TIMEOUT을 같이 섞으면 지연시간 percentile이 왜곡된다.
export function pollUntilDone(jobId, trend, intervalSeconds = 0.3, timeoutSeconds = 60) {
  const start = Date.now();
  while ((Date.now() - start) / 1000 < timeoutSeconds) {
    const res = http.get(`${BASE_URL}/api/v1/jobs/${jobId}`);
    let status = '';
    try {
      status = JSON.parse(res.body).status;
    } catch (e) {
      status = '';
    }
    if (status === 'DONE' || status === 'FAILED') {
      const elapsedMs = Date.now() - start;
      if (trend && status === 'DONE') trend.add(elapsedMs);
      return { status, elapsedMs };
    }
    sleep(intervalSeconds);
  }
  return { status: 'TIMEOUT', elapsedMs: Date.now() - start };
}
