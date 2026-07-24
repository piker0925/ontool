#!/usr/bin/env bash
# 시나리오 1 — HEAVY 레인(permit=2), 소유자 2명.
# A가 다량(N_A)을 먼저 넣고, 그 직후 B가 1건을 넣는다. B가 A의 백로그와 무관하게
# "이른 틱"에 서비스되는지(공정성 성립) 확인한다. 이슈 103.
set -uo pipefail
cd "$(dirname "$0")"
source ./bench-lib.sh

N_A="${N_A:-40}"
RAW="${RAW_DIR:-../raw/scenario1}"
mkdir -p "$RAW"

echo "[scenario1] reset job table"
reset_jobs

echo "[scenario1] A submits ${N_A} image-resize jobs"
for i in $(seq 1 "$N_A"); do
  submit_job image-resize ownerA "$IMG_SAMPLE" >/dev/null
done

echo "[scenario1] B submits 1 image-resize job immediately after"
b_job=$(submit_job image-resize ownerB "$IMG_SAMPLE")
echo "B job id: $b_job"

echo "[scenario1] polling until B's job is terminal..."
b_done_epoch=$(poll_until_terminal "$b_job" 0.3 120)
echo "B terminal observed at epoch $b_done_epoch"

echo "[scenario1] waiting for full drain (all jobs terminal) before querying..."
for _ in $(seq 1 200); do
  pending=$(db_query "SELECT COUNT(*) FROM job WHERE status IN ('PENDING','RUNNING');")
  [ "$pending" = "0" ] && break
  sleep 0.5
done

db_query "SELECT id, owner_token, status, created_at, started_at FROM job ORDER BY created_at ASC;" \
  > "$RAW/all-jobs.tsv"

# B의 시작 시각(started_at)과, B가 시작된 "이후"에도 여전히 시작되지 못하고 있던 A의 잔여 작업 수
# (= A 작업 중 started_at이 B보다 늦은 것들 — 공정하다면 이 값이 N_A-1에 가까워야 하고, FIFO였다면 0이어야 한다).
b_started=$(db_query "SELECT started_at FROM job WHERE owner_token='ownerB' LIMIT 1;")
a_still_behind_b=$(db_query "SELECT COUNT(*) FROM job WHERE owner_token='ownerA' AND started_at > (SELECT started_at FROM job WHERE owner_token='ownerB' LIMIT 1);")
b_rank=$(db_query "SELECT COUNT(*) FROM job WHERE started_at <= (SELECT started_at FROM job WHERE owner_token='ownerB' LIMIT 1) AND started_at IS NOT NULL;")

{
  echo "N_A=${N_A}"
  echo "B started_at=${b_started}"
  echo "B rank by started_at (1-based, ties included)=${b_rank}"
  echo "A jobs that started AFTER B (= A backlog still behind B)=${a_still_behind_b} / ${N_A}"
} > "$RAW/summary.txt"

cat "$RAW/summary.txt"
echo "[scenario1] raw data: $RAW/all-jobs.tsv"
