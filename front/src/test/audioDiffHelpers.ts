// 테스트 전용 헬퍼. audioEncode.ts 등 프로덕션 코드와 독립적으로 구현한다(audioTestHelpers.ts와
// 같은 원칙) — 인코더가 자신을 검증하는 동어반복을 피하기 위함.
//
// 손실 인코딩(mp3) 왕복 품질을 측정하려면 "원본 vs 디코딩 결과"를 직접 뺄셈하면 안 된다 —
// MP3 인코더(LAME 계열)는 프레임 앞에 인코더 지연(보통 1105~1152샘플)을 추가하므로, 정렬 없이
// 빼면 파형 전체가 밀려 실제로는 미세한 손실인 구간도 "완전히 다른 신호"로 측정된다. 그래서
// 먼저 교차상관으로 최적 지연(lag)을 찾아 정렬한 뒤에만 차이를 측정한다.

/** mono 신호 a를 기준으로 b를 -maxLag..+maxLag 범위에서 이동시켜 가장 상관이 높은 지연을 찾는다. */
export function findBestLag(a: Float32Array, b: Float32Array, maxLag: number): number {
    let bestLag = 0
    let bestScore = -Infinity
    const compareLength = Math.min(a.length, b.length) - maxLag * 2
    if (compareLength <= 0) throw new Error('신호가 너무 짧아 정렬 탐색 범위를 확보할 수 없습니다')

    for (let lag = -maxLag; lag <= maxLag; lag++) {
        let score = 0
        for (let i = 0; i < compareLength; i++) {
            score += a[i + maxLag] * b[i + maxLag + lag]
        }
        if (score > bestScore) {
            bestScore = score
            bestLag = lag
        }
    }
    return bestLag
}

/**
 * lag만큼 정렬한 뒤 두 신호의 SNR(dB)을 계산한다 — signal power(원본 기준) / noise power(차이).
 * 값이 클수록 손실이 적다는 뜻. 완전히 동일하면 +Infinity.
 */
export function alignedSnrDb(reference: Float32Array, candidate: Float32Array, lag: number): number {
    const maxLag = Math.abs(lag) + 1
    const compareLength = Math.min(reference.length, candidate.length) - maxLag * 2
    if (compareLength <= 0) throw new Error('신호가 너무 짧아 SNR 비교 구간을 확보할 수 없습니다')

    let signalPower = 0
    let noisePower = 0
    for (let i = 0; i < compareLength; i++) {
        const ref = reference[i + maxLag]
        const cand = candidate[i + maxLag + lag]
        signalPower += ref * ref
        const diff = ref - cand
        noisePower += diff * diff
    }
    if (noisePower === 0) return Infinity
    return 10 * Math.log10(signalPower / noisePower)
}
