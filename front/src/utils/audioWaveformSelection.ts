/**
 * AudioWaveformPlayer.vue의 파형 캔버스 위에서 드래그로 A-B 구간을 선택할 때 쓰는
 * x좌표(px) ↔ 재생 시각(초) 변환. DOM/캔버스와 무관한 순수 계산이라 vitest에서
 * 그대로 단위 테스트할 수 있다 — 드래그 자체(mousedown/mousemove/mouseup)의
 * 실제 UX는 jsdom에서 의미 있게 검증할 수 없어 브라우저 검증으로 확인한다.
 */
export function pixelToSeconds(x: number, canvasWidth: number, durationSeconds: number): number {
    if (canvasWidth <= 0) return 0
    const ratio = Math.max(0, Math.min(1, x / canvasWidth))
    return ratio * durationSeconds
}

export function secondsToPixel(seconds: number, canvasWidth: number, durationSeconds: number): number {
    if (durationSeconds <= 0) return 0
    const ratio = Math.max(0, Math.min(1, seconds / durationSeconds))
    return ratio * canvasWidth
}
