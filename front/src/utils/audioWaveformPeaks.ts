/**
 * 파형 시각화를 위해 interleaved PCM을 bucketCount개의 구간으로 나누고, 각 구간의
 * 최대 절대 진폭(모든 채널 중 최댓값)을 뽑아낸다. 캔버스 등 렌더링 방식과 무관한
 * 순수 계산이라 vitest에서 그대로 단위 테스트할 수 있다.
 */
export function computeWaveformPeaks(interleaved: Float32Array, channels: number, bucketCount: number): number[] {
    const frameCount = interleaved.length / channels
    const peaks = new Array<number>(bucketCount).fill(0)
    if (frameCount === 0 || bucketCount === 0) return peaks

    const framesPerBucket = frameCount / bucketCount

    for (let bucket = 0; bucket < bucketCount; bucket++) {
        const startFrame = Math.floor(bucket * framesPerBucket)
        const endFrame = Math.max(startFrame + 1, Math.floor((bucket + 1) * framesPerBucket))
        let maxAbs = 0
        for (let frame = startFrame; frame < endFrame && frame < frameCount; frame++) {
            for (let c = 0; c < channels; c++) {
                const abs = Math.abs(interleaved[frame * channels + c])
                if (abs > maxAbs) maxAbs = abs
            }
        }
        peaks[bucket] = maxAbs
    }

    return peaks
}
