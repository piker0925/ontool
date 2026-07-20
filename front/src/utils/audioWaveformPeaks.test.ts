import {describe, expect, it} from 'vitest'
import {computeWaveformPeaks} from './audioWaveformPeaks'

describe('computeWaveformPeaks', () => {
    it('요청한 버킷 개수만큼 피크 배열을 반환한다', () => {
        const interleaved = new Float32Array(1000).map((_, i) => Math.sin(i))
        const peaks = computeWaveformPeaks(interleaved, 1, 10)
        expect(peaks).toHaveLength(10)
    })

    it('각 버킷 값은 해당 구간의 최대 절대 진폭이다(모노, 단조 증가 구간 검증)', () => {
        // 4프레임씩 4버킷 = 16프레임. 버킷별 최대 절대값을 미리 계산해 기준값으로 사용.
        const mono = new Float32Array([0, 0.1, 0.2, 0.1, 0.5, -0.9, 0.3, 0.2, -0.1, 0.05, 0.02, 0.01, 1.0, 0.5, -0.5, 0.1])
        const peaks = computeWaveformPeaks(mono, 1, 4)

        expect(peaks[0]).toBeCloseTo(0.2, 5)
        expect(peaks[1]).toBeCloseTo(0.9, 5)
        expect(peaks[2]).toBeCloseTo(0.1, 5)
        expect(peaks[3]).toBeCloseTo(1.0, 5)
    })

    it('스테레오는 두 채널 중 더 큰 진폭을 사용한다', () => {
        // interleaved LR: L=[0.1, 0.2], R=[0.9, 0.05] → 버킷1개(전체)에서 최대는 0.9(R)
        const interleaved = new Float32Array([0.1, 0.9, 0.2, 0.05])
        const peaks = computeWaveformPeaks(interleaved, 2, 1)
        expect(peaks[0]).toBeCloseTo(0.9, 5)
    })

    it('무음(전부 0)이면 모든 버킷이 0이다', () => {
        const peaks = computeWaveformPeaks(new Float32Array(100), 1, 5)
        expect(peaks.every(p => p === 0)).toBe(true)
    })
})
