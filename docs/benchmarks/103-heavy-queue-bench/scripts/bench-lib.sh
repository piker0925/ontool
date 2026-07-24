#!/usr/bin/env bash
# 이슈 103 — Heavy 큐 공정성·admission control 로컬 벤치마크 공용 함수.
# bash + curl만 쓴다(신규 의존성 없음, 이슈 스펙). 이 파일은 소싱해서 쓴다: source bench-lib.sh
#
# 실행 전 필요한 것 (README.md "재현 방법" 참고):
#   - 백엔드가 BASE_URL(기본 http://localhost:8103)에서 local,local-benchmark 프로파일로 떠 있을 것
#   - job 테이블에 접근 가능한 MySQL 컨테이너가 DB_CONTAINER(기본 devtoolbox-bench-mysql) 이름으로 떠 있을 것
#   - 공유 docker-compose MySQL(3306)이 아니라 이 벤치마크 전용 인스턴스를 가리킬 것 (README 참고)
set -uo pipefail

BASE_URL="${BASE_URL:-http://localhost:8103}"
DB_CONTAINER="${DB_CONTAINER:-devtoolbox-bench-mysql}"
DB_NAME="${DB_NAME:-devtoolbox_bench}"

REPO_ROOT="$(git -C "$(dirname "${BASH_SOURCE[0]}")" rev-parse --show-toplevel)"
IMG_SAMPLE="${IMG_SAMPLE:-$REPO_ROOT/back/src/test/resources/samples/test.png}"
VIDEO_SAMPLE="${VIDEO_SAMPLE:-$(dirname "${BASH_SOURCE[0]}")/fixtures/sample.mp4}"

# devtoolbox_bench의 job 테이블에 대해 SQL을 실행하고 탭 구분 결과를 stdout으로 낸다(헤더 없음, -N -B).
db_query() {
  docker exec "$DB_CONTAINER" mysql -uroot -proot -N -B -e "$1" "$DB_NAME" 2>/dev/null
}

# job 테이블을 비운다 — 시나리오 간 상태 격리(이전 시나리오의 PENDING/DONE 잔재가 다음 측정에 섞이지 않게).
reset_jobs() {
  db_query "DELETE FROM job;"
}

# 모듈에 파일을 업로드해 Job을 생성한다. 표준출력으로 jobId만 낸다.
#   submit_job <moduleId> <ownerToken> <filePath>
submit_job() {
  local module_id="$1" owner="$2" file="$3"
  local resp
  resp=$(curl -s -X POST "${BASE_URL}/api/v1/tools/${module_id}/upload" \
    -H "X-Client-Id: ${owner}" \
    -F "files=@${file}")
  local job_id
  job_id=$(echo "$resp" | python3 -c "import sys,json
try:
    d=json.load(sys.stdin)
    print(d.get('jobId',''))
except Exception:
    print('')")
  if [ -z "$job_id" ]; then
    echo "SUBMIT_FAILED:${resp}" >&2
    echo ""
    return 1
  fi
  echo "$job_id"
}

# HTTP 상태 코드만 알고 싶을 때(과부하 거부 시나리오용) — jobId 대신 코드를 stdout에 낸다.
# 응답 바디는 /tmp/bench_last_resp.json에 남는다.
#   submit_job_status_code <moduleId> <ownerToken> <filePath>
submit_job_status_code() {
  local module_id="$1" owner="$2" file="$3"
  curl -s -o /tmp/bench_last_resp.json -w '%{http_code}' -X POST "${BASE_URL}/api/v1/tools/${module_id}/upload" \
    -H "X-Client-Id: ${owner}" \
    -F "files=@${file}"
}

# jobId가 DONE/FAILED가 될 때까지 폴링하고, 처음 관측한 벽시계 시각(epoch, 소수점 초)을 stdout에 낸다.
#   poll_until_terminal <jobId> [interval_seconds] [timeout_seconds]
poll_until_terminal() {
  local job_id="$1" interval="${2:-0.3}" timeout="${3:-180}"
  local start
  start=$(python3 -c "import time; print(time.time())")
  while true; do
    local st
    st=$(curl -s "${BASE_URL}/api/v1/jobs/${job_id}" | python3 -c "import sys,json
try:
    print(json.load(sys.stdin).get('status',''))
except Exception:
    print('')")
    if [ "$st" = "DONE" ] || [ "$st" = "FAILED" ]; then
      python3 -c "import time; print(f'{time.time():.3f}')"
      return 0
    fi
    local now
    now=$(python3 -c "import time; print(time.time())")
    if python3 -c "exit(0 if ${now} - ${start} > ${timeout} else 1)"; then
      echo "TIMEOUT" >&2
      echo ""
      return 1
    fi
    sleep "$interval"
  done
}

wait_for_up() {
  local tries="${1:-60}"
  for _ in $(seq 1 "$tries"); do
    if curl -s -o /dev/null -w '%{http_code}' "${BASE_URL}/api/v1/modules" | grep -q 200; then
      return 0
    fi
    sleep 1
  done
  return 1
}
