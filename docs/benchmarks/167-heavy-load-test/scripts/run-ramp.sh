#!/usr/bin/env bash
# 이슈 167 — scenario1/scenario2를 고정 동시성 수준별로 반복 실행해 램프업 곡선(동시성별 표 행)을 만든다.
# ramping-vus 하나로 안 합친 이유는 scenario1-heavy-ramp.js 상단 주석 참고.
#   ./run-ramp.sh <scenario-file> <label>
#   예: ./run-ramp.sh scenario1-heavy-ramp.js heavy
#       ./run-ramp.sh scenario2-video-ramp.js video
set -euo pipefail

SCRIPT="$1"
LABEL="$2"
LEVELS=(${LEVELS:-1 5 10 20 40})
DURATION="${DURATION:-30s}"

DB_CONTAINER="${DB_CONTAINER:-devtoolbox-bench167-mysql}"
DB_NAME="${DB_NAME:-devtoolbox_bench167}"
BASE_URL="${BASE_URL:-http://localhost:8167}"
UPLOAD_DIR="${UPLOAD_DIR:-/tmp/devtoolbox-bench167-uploads}"
# 원격(ADR-0037) 실행 시: k6는 SSH 터널을 통해 Mac에서 돌지만, docker exec로 DB를 비우는 건
# Mac의 로컬 Docker가 아니라 원격 서버의 Docker를 대상으로 해야 한다. SSH_HOST를 설정하면
# reset_jobs가 로컬 docker exec 대신 ssh로 원격에서 그 명령을 실행한다.
#   SSH_HOST="opc@140.245.69.204" SSH_KEY="$HOME/Documents/DevToolbox/ssh-key-2026-07-07.key" \
#   DB_CONTAINER=devtoolbox-bench-mysql BACKEND_CONTAINER=devtoolbox-bench-backend \
#   LEVELS="1 5 10 20 40" DURATION=30s ./run-ramp.sh scenario1-heavy-ramp.js heavy
SSH_HOST="${SSH_HOST:-}"
SSH_KEY="${SSH_KEY:-}"
BACKEND_CONTAINER="${BACKEND_CONTAINER:-devtoolbox-bench-backend}"

cd "$(dirname "$0")"
RAW_DIR="../raw/${LABEL}-ramp"
mkdir -p "$RAW_DIR"

reset_jobs() {
  if [ -n "$SSH_HOST" ]; then
    ssh -i "$SSH_KEY" "$SSH_HOST" \
      "docker exec ${DB_CONTAINER} mysql -uroot -proot -e 'DELETE FROM job;' ${DB_NAME} && docker exec ${BACKEND_CONTAINER} rm -rf /app/uploads/*" \
      2>/dev/null || true
  else
    docker exec "$DB_CONTAINER" mysql -uroot -proot -e "DELETE FROM job;" "$DB_NAME" 2>/dev/null
    rm -rf "${UPLOAD_DIR:?}"/* 2>/dev/null || true
  fi
}

for vus in "${LEVELS[@]}"; do
  echo "[run-ramp] ${LABEL} VUS=${vus} DURATION=${DURATION}"
  reset_jobs
  TARGET_VUS="$vus" DURATION="$DURATION" BASE_URL="$BASE_URL" \
    k6 run --summary-export="${RAW_DIR}/vus-${vus}.json" "$SCRIPT"
done

echo "[run-ramp] done — summaries in ${RAW_DIR}/"
