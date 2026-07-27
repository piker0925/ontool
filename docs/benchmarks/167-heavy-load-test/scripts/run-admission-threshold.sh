#!/usr/bin/env bash
# 이슈 167 — scenario3(admission 임계점)을 실행하고 결과를 raw/에 저장한다.
# 실행 전 백엔드를 적절한 플래그로 재기동해야 한다 — scenario3-admission-threshold.js 상단 주석 참고.
#   ./run-admission-threshold.sh queue   (사전: --scheduling.worker.delay=3600000로 백엔드 재기동)
#   ./run-admission-threshold.sh disk    (사전: --storage.disk-budget-bytes=<작은 값>으로 백엔드 재기동)
set -euo pipefail

MODE="$1"   # queue | disk
DB_CONTAINER="${DB_CONTAINER:-devtoolbox-bench167-mysql}"
DB_NAME="${DB_NAME:-devtoolbox_bench167}"
BASE_URL="${BASE_URL:-http://localhost:8167}"
# job 테이블만 비우고 업로드 파일을 안 지우면, MODE=disk(디스크 예산 1KB처럼 작게 잡는 테스트)가
# 이전 실행의 잔여 파일 때문에 "이미 예산을 넘긴 상태"에서 시작해 몇 번째에 거부되는지가 왜곡된다.
# MODE별 기본 업로드 디렉토리가 다르므로(재기동 커맨드와 일치시킬 것) 필요시 오버라이드한다.
DEFAULT_UPLOAD_DIR="/tmp/devtoolbox-bench167-uploads"
[ "$MODE" = "disk" ] && DEFAULT_UPLOAD_DIR="/tmp/devtoolbox-bench167-uploads-diskmode"
UPLOAD_DIR="${UPLOAD_DIR:-$DEFAULT_UPLOAD_DIR}"

cd "$(dirname "$0")"
RAW_DIR="../raw/admission-${MODE}"
mkdir -p "$RAW_DIR"

echo "[run-admission] resetting job table and upload dir (${UPLOAD_DIR})"
docker exec "$DB_CONTAINER" mysql -uroot -proot -e "DELETE FROM job;" "$DB_NAME" 2>/dev/null
rm -rf "${UPLOAD_DIR:?}"/* 2>/dev/null || true

MODE="$MODE" BASE_URL="$BASE_URL" k6 run scenario3-admission-threshold.js 2>&1 | tee "${RAW_DIR}/run.log"

{
  echo "request_index,pending_before,http_status"
  grep "ATTEMPT_CSV " "${RAW_DIR}/run.log" | sed -E 's/.*ATTEMPT_CSV ([0-9]+,[0-9]+,[0-9]+).*/\1/'
} > "${RAW_DIR}/attempts.csv"

grep "ADMISSION_SUMMARY " "${RAW_DIR}/run.log" | sed -E 's/.*(ADMISSION_SUMMARY .*)" source=console/\1/' > "${RAW_DIR}/summary.txt"

echo "[run-admission] ${RAW_DIR}/attempts.csv, ${RAW_DIR}/summary.txt"
cat "${RAW_DIR}/summary.txt"
cat "${RAW_DIR}/attempts.csv"
