#!/usr/bin/env bash
# 이슈 167 — scenario4(과부하 중 다른 소유자 보호)를 실행하고 결과를 raw/에 저장한다.
# 일반 백엔드(워커 정상 동작)에서 실행한다 — scenario3과 달리 워커 정지 플래그가 필요 없다.
set -euo pipefail

DB_CONTAINER="${DB_CONTAINER:-devtoolbox-bench167-mysql}"
DB_NAME="${DB_NAME:-devtoolbox_bench167}"
BASE_URL="${BASE_URL:-http://localhost:8167}"
# job 테이블만 비우면 업로드 디렉토리에 파일이 계속 쌓인다 — 지금 당장은 이 시나리오에 영향 없지만
# (디스크 예산 제한 없이 도는 백엔드), 습관적으로 같이 정리해 반복 실행 시 디스크가 누적되지 않게 한다.
UPLOAD_DIR="${UPLOAD_DIR:-/tmp/devtoolbox-bench167-uploads}"

cd "$(dirname "$0")"
RAW_DIR="../raw/protection"
mkdir -p "$RAW_DIR"

echo "[run-protection] resetting job table and upload dir"
docker exec "$DB_CONTAINER" mysql -uroot -proot -e "DELETE FROM job;" "$DB_NAME" 2>/dev/null
rm -rf "${UPLOAD_DIR:?}"/* 2>/dev/null || true

BASE_URL="$BASE_URL" k6 run scenario4-protection-under-load.js 2>&1 | tee "${RAW_DIR}/run.log"

{
  echo "request_index,http_status"
  grep "FLOOD_CSV " "${RAW_DIR}/run.log" | sed -E 's/.*FLOOD_CSV ([0-9]+,[0-9]+).*/\1/'
} > "${RAW_DIR}/flood-attempts.csv"

grep "FLOOD_SUMMARY " "${RAW_DIR}/run.log" | sed -E 's/.*(FLOOD_SUMMARY .*)" source=console/\1/' > "${RAW_DIR}/flood-summary.txt"
grep "VICTIM_SUMMARY " "${RAW_DIR}/run.log" | sed -E 's/.*(VICTIM_SUMMARY .*)" source=console/\1/' > "${RAW_DIR}/victim-summary.txt"
grep "CONCURRENT_SUMMARY " "${RAW_DIR}/run.log" | sed -E 's/.*(CONCURRENT_SUMMARY .*)" source=console/\1/' > "${RAW_DIR}/concurrent-summary.txt"

echo "[run-protection] ${RAW_DIR}/{flood-attempts.csv,flood-summary.txt,victim-summary.txt,concurrent-summary.txt}"
cat "${RAW_DIR}/flood-summary.txt"
cat "${RAW_DIR}/concurrent-summary.txt"
cat "${RAW_DIR}/victim-summary.txt"
