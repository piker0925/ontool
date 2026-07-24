#!/usr/bin/env bash
# 시나리오 3 — VIDEO 레인(permit=1), 소유자 2명.
# A가 admission 큐 깊이 상한(10) 이내로 투입, B가 뒤늦게 1건 투입. permit=1이면 한 틱에 고를 수
# 있는 건 정확히 1건이라 selectFair의 owner 순회는 항상 "맵에 먼저 등록된 owner"(A)를 먼저 뽑는다 —
# 즉 permit=1일 때는 owner가 몇 명이든 한 owner의 백로그가 다 빌 때까지 다른 owner는 매 틱 밀린다.
# B의 최악 대기시간이 "B가 도착한 시점의 A 잔여 백로그 크기"와 비례하는지 수치로 확인한다. 이슈 103.
set -uo pipefail
cd "$(dirname "$0")"
source ./bench-lib.sh

N_A="${N_A:-8}"
RAW="${RAW_DIR:-../raw/scenario3}"
mkdir -p "$RAW"

echo "[scenario3] reset job table"
reset_jobs

echo "[scenario3] A submits ${N_A} video-to-gif jobs (VIDEO lane, permit=1)"
for i in $(seq 1 "$N_A"); do
  submit_job video-to-gif ownerA "$VIDEO_SAMPLE" >/dev/null
done

a_pending_at_b_submit=$(db_query "SELECT COUNT(*) FROM job WHERE owner_token='ownerA' AND status='PENDING';")
echo "[scenario3] A pending backlog right before B submits: ${a_pending_at_b_submit}"

b_submit_epoch=$(python3 -c "import time; print(time.time())")
b_job=$(submit_job video-to-gif ownerB "$VIDEO_SAMPLE")
echo "B job id: $b_job"

echo "[scenario3] polling until B's job is terminal..."
b_done_epoch=$(poll_until_terminal "$b_job" 0.3 180)
b_wait_seconds=$(python3 -c "print(f'{${b_done_epoch} - ${b_submit_epoch}:.1f}')")
echo "B waited ${b_wait_seconds}s from submit to terminal"

echo "[scenario3] waiting for full drain before querying..."
for _ in $(seq 1 200); do
  pending=$(db_query "SELECT COUNT(*) FROM job WHERE status IN ('PENDING','RUNNING');")
  [ "$pending" = "0" ] && break
  sleep 0.5
done

db_query "SELECT id, owner_token, status, created_at, started_at FROM job ORDER BY created_at ASC;" \
  > "$RAW/all-jobs.tsv"

b_started=$(db_query "SELECT started_at FROM job WHERE owner_token='ownerB' LIMIT 1;")
a_still_behind_b=$(db_query "SELECT COUNT(*) FROM job WHERE owner_token='ownerA' AND started_at > (SELECT started_at FROM job WHERE owner_token='ownerB' LIMIT 1);")

{
  echo "N_A=${N_A}"
  echo "A pending backlog at moment B submitted=${a_pending_at_b_submit}"
  echo "B started_at=${b_started}"
  echo "B wall-clock wait (submit->terminal)=${b_wait_seconds}s"
  echo "A jobs that started AFTER B (should be ~0 — B waits behind ALL of A's backlog with permit=1)=${a_still_behind_b}"
} > "$RAW/summary.txt"

cat "$RAW/summary.txt"
echo "[scenario3] raw data: $RAW/all-jobs.tsv"
