#!/usr/bin/env bash
# 시나리오 4 부록 — 디스크 예산 초과 거부(507 STORAGE_FULL, AdmissionControl 036).
# 실제 운영 예산(기본 10GB)을 로컬에서 채우는 건 비현실적이므로, 이 스크립트는 앱을
# --storage.disk-budget-bytes=1024(1KB)로 띄운 상태에서 실행해 "게이트 로직 자체"를 저비용으로
# 검증한다(이슈 103 스펙 "여유 있으면 같은 방식으로 확인"). 실제 운영 디스크 사용량과는 무관 —
# checkDiskBudget(usage>budget → 507)이 실제로 걸리는지만 본다.
set -uo pipefail
cd "$(dirname "$0")"
source ./bench-lib.sh

RAW="${RAW_DIR:-../raw/scenario4b-storage-full}"
mkdir -p "$RAW"

echo "[scenario4b] reset job table"
reset_jobs

echo "[scenario4b] submitting image-resize with tiny disk budget (app must run with --storage.disk-budget-bytes=1024)"
CSV="$RAW/submit-log.csv"
echo "request_index,http_status" > "$CSV"
for i in 1 2 3; do
  code=$(submit_job_status_code image-resize ownerDisk "$IMG_SAMPLE")
  echo "${i},${code}" >> "$CSV"
  echo "request ${i}: HTTP ${code} : $(cat /tmp/bench_last_resp.json)"
  if [ "$i" = "2" ]; then
    cp /tmp/bench_last_resp.json "$RAW/rejection-body.json"
  fi
done | tee "$RAW/log.txt"

echo "[scenario4b] log: $CSV"
