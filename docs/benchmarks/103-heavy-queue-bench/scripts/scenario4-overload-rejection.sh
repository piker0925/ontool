#!/usr/bin/env bash
# 시나리오 4 — 과부하 거부(AdmissionControl, 036). VIDEO 레인 큐 깊이 상한(기본 10)을 넘기면
# 즉시 503 QUEUE_FULL이 반환되고 시스템이 정상 상태를 유지하는지 확인한다.
# 주의: 이 스크립트는 워커를 정지(--scheduling.worker.delay=3600000)한 상태에서 실행해야 한다 —
# 그래야 요청 사이에 PENDING이 드레인되지 않아 "몇 번째 요청에서 거부되는가"가 결정적으로 재현된다.
# AdmissionControl.assertCapacityAvailable은 "삽입 전" pendingCount를 검사한다(threshold 초과만 거부,
# 같음은 통과) — 따라서 이론적으로 threshold=10이면 11번째 요청까지 통과하고 12번째에서 거부되어야 한다
# (이슈 원문의 "11번째"는 그릴링 당시 추정치였고, 실측으로 검증한다 — README "발견" 참고).
set -uo pipefail
cd "$(dirname "$0")"
source ./bench-lib.sh

RAW="${RAW_DIR:-../raw/scenario4}"
mkdir -p "$RAW"

echo "[scenario4] reset job table"
reset_jobs

echo "[scenario4] rapid-fire submitting video-to-gif until rejected (worker must be paused)"
CSV="$RAW/submit-log.csv"
echo "request_index,http_status,pending_before" > "$CSV"

rejected_at=""
for i in $(seq 1 20); do
  pending_before=$(db_query "SELECT COUNT(*) FROM job WHERE lane='VIDEO' AND status='PENDING';")
  code=$(submit_job_status_code video-to-gif ownerFlood "$VIDEO_SAMPLE")
  echo "${i},${code},${pending_before}" >> "$CSV"
  echo "request ${i}: pending_before=${pending_before} -> HTTP ${code}"
  if [ "$code" != "202" ]; then
    rejected_at="$i"
    cp /tmp/bench_last_resp.json "$RAW/rejection-body.json"
    break
  fi
done

pending_after=$(db_query "SELECT COUNT(*) FROM job WHERE lane='VIDEO' AND status='PENDING';")

{
  echo "rejected_at_request_index=${rejected_at:-none}"
  echo "pending_count_after_rejection=${pending_after}"
  echo "rejection_body=$(cat "$RAW/rejection-body.json" 2>/dev/null)"
} > "$RAW/summary.txt"

cat "$RAW/summary.txt"
echo "[scenario4] log: $CSV"
