#!/usr/bin/env bash
# 시나리오 2 — HEAVY 레인(permit=2), 소유자 3명 이상.
# A·B가 먼저 다량 투입, C가 뒤늦게 소량 투입. selectFair가 owner 순회 도중 chosen.size()>=limit이면
# 즉시 break하므로(JobWorker.java의 selectFair), limit(2) < owner 수(3)인 한 C는 A·B의 백로그가
# 완전히 빌 때까지 단 한 틱도 선택되지 못한다 — 127 수정 전 baseline. 이슈 103.
set -uo pipefail
cd "$(dirname "$0")"
source ./bench-lib.sh

N_A="${N_A:-20}"
N_B="${N_B:-20}"
N_C="${N_C:-3}"
RAW="${RAW_DIR:-../raw/scenario2}"
mkdir -p "$RAW"

echo "[scenario2] reset job table"
reset_jobs

echo "[scenario2] A submits ${N_A}, B submits ${N_B} image-resize jobs"
for i in $(seq 1 "$N_A"); do submit_job image-resize ownerA "$IMG_SAMPLE" >/dev/null; done
for i in $(seq 1 "$N_B"); do submit_job image-resize ownerB "$IMG_SAMPLE" >/dev/null; done

echo "[scenario2] C submits ${N_C} jobs late"
for i in $(seq 1 "$N_C"); do submit_job image-resize ownerC "$IMG_SAMPLE" >/dev/null; done

echo "[scenario2] polling every 2s, recording PENDING counts per owner + C's status until full drain"
TS_CSV="$RAW/timeseries.csv"
echo "elapsed_s,a_pending,b_pending,c_pending,c_done,c_running" > "$TS_CSV"
start=$(python3 -c "import time; print(time.time())")
c_first_started_logged=""
for tick in $(seq 1 200); do
  a_p=$(db_query "SELECT COUNT(*) FROM job WHERE owner_token='ownerA' AND status='PENDING';")
  b_p=$(db_query "SELECT COUNT(*) FROM job WHERE owner_token='ownerB' AND status='PENDING';")
  c_p=$(db_query "SELECT COUNT(*) FROM job WHERE owner_token='ownerC' AND status='PENDING';")
  c_done=$(db_query "SELECT COUNT(*) FROM job WHERE owner_token='ownerC' AND status='DONE';")
  c_running=$(db_query "SELECT COUNT(*) FROM job WHERE owner_token='ownerC' AND status='RUNNING';")
  now=$(python3 -c "import time; print(time.time())")
  elapsed=$(python3 -c "print(f'{${now} - ${start}:.1f}')")
  echo "${elapsed},${a_p},${b_p},${c_p},${c_done},${c_running}" >> "$TS_CSV"

  if [ -z "$c_first_started_logged" ] && { [ "$c_done" != "0" ] || [ "$c_running" != "0" ]; }; then
    c_first_started_logged="$elapsed"
    echo "[scenario2] C's first job left PENDING at elapsed=${elapsed}s (a_pending=${a_p}, b_pending=${b_p})"
  fi

  total_pending=$(db_query "SELECT COUNT(*) FROM job WHERE status IN ('PENDING','RUNNING');")
  [ "$total_pending" = "0" ] && break
  sleep 2
done

db_query "SELECT id, owner_token, status, created_at, started_at FROM job ORDER BY created_at ASC;" \
  > "$RAW/all-jobs.tsv"

ab_drain_elapsed=$(python3 -c "
import csv
with open('$TS_CSV') as f:
    rows = list(csv.DictReader(f))
for r in rows:
    if int(r['a_pending']) == 0 and int(r['b_pending']) == 0:
        print(r['elapsed_s']); break
else:
    print('never')
")

{
  echo "N_A=${N_A} N_B=${N_B} N_C=${N_C}"
  echo "C's first job left PENDING at elapsed=${c_first_started_logged:-never}s"
  echo "A+B backlog fully drained at elapsed=${ab_drain_elapsed}s"
} > "$RAW/summary.txt"

cat "$RAW/summary.txt"
echo "[scenario2] time series: $TS_CSV"
