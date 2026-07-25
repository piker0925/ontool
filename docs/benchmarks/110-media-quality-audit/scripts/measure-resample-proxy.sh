#!/usr/bin/env bash
# 이슈 110 — README 3-4절 "리샘플링 손실" 프록시 측정을 재현한다.
#
# 실제 브라우저의 AudioContext 리샘플러는 Node/서버 환경에서 재현할 수 없어, ffmpeg의
# 기본 swresample을 "합리적으로 잘 만든 리샘플러라면 어느 정도 손실인가"의 프록시로 쓴다.
# 44.1kHz 원본을 48kHz로 올렸다가 다시 44.1kHz로 내려(왕복) 원본과 비교한다 — 편도
# 리샘플(디코드 시 1회)만 있는 실제 시나리오보다 손실을 2배 겪는 셈이라, 여기 나오는 SNR은
# 실제보다 약간 더 나쁘게 잡히는 보수적 측정이다.
#
# 실행: back/src/test/resources/samples/quality-audit/audio-master.wav가 필요하다.
#   ./measure-resample-proxy.sh
# 출력: "RMS level dB" 두 줄(원본, 왕복 후 차이 신호) — README의 82.4dB는 이 둘의 차.

set -euo pipefail
cd "$(dirname "$0")"

SAMPLE="../../../../back/src/test/resources/samples/quality-audit/audio-master.wav"
if [[ ! -f "$SAMPLE" ]]; then
    echo "샘플을 찾을 수 없습니다: $SAMPLE" >&2
    exit 1
fi

WORKDIR=$(mktemp -d)
trap 'rm -rf "$WORKDIR"' EXIT

ffmpeg -y -v error -i "$SAMPLE" -af "aresample=48000" -c:a pcm_s16le "$WORKDIR/up48.wav"
ffmpeg -y -v error -i "$WORKDIR/up48.wav" -af "aresample=44100" -c:a pcm_s16le "$WORKDIR/roundtrip44.wav"

echo "=== 원본 RMS 레벨(신호 기준) ==="
ffmpeg -v info -i "$SAMPLE" -af astats -f null - 2>&1 | grep "RMS level dB" | tail -1

echo "=== 원본 대비 왕복 후 차이 신호의 RMS 레벨(잡음 기준) ==="
# astats는 -v error보다 상세한 로그 레벨(info)에서만 콘솔에 값을 찍는다.
ffmpeg -v info -i "$SAMPLE" -i "$WORKDIR/roundtrip44.wav" \
    -lavfi "[0:a][1:a]amix=inputs=2:weights='1 -1':duration=shortest,astats=metadata=1:reset=1" \
    -f null - 2>&1 | grep "RMS level dB" | tail -1

echo
echo "SNR(dB) = 위 두 RMS 레벨의 차 (신호 RMS - 잡음 RMS). README 3-4절 82.4dB ≈ -12.6dB - (-95dB)."
