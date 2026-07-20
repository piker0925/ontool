export interface PixelBuffer {
    width: number
    height: number
    data: Uint8ClampedArray<ArrayBuffer>
}

export interface DiffResult {
    diffData: Uint8ClampedArray<ArrayBuffer>
    diffRatio: number
}

const DEFAULT_THRESHOLD = 32

/** 두 이미지를 픽셀 단위로 비교해 차이 히트맵과 차이 픽셀 비율을 계산한다. */
export function diffImages(a: PixelBuffer, b: PixelBuffer, threshold = DEFAULT_THRESHOLD): DiffResult {
    if (a.width !== b.width || a.height !== b.height) {
        throw new Error('두 이미지의 크기가 같아야 비교할 수 있습니다')
    }

    const pixelCount = a.width * a.height
    const diffData = new Uint8ClampedArray(a.data.length)
    let diffCount = 0

    for (let i = 0; i < pixelCount; i++) {
        const o = i * 4
        const dr = a.data[o] - b.data[o]
        const dg = a.data[o + 1] - b.data[o + 1]
        const db = a.data[o + 2] - b.data[o + 2]
        const distance = Math.sqrt(dr * dr + dg * dg + db * db)
        const differs = distance > threshold

        if (differs) {
            diffCount++
            diffData.set([255, 0, 0, 255], o)
        } else {
            diffData.set([a.data[o], a.data[o + 1], a.data[o + 2], 80], o)
        }
    }

    return {diffData, diffRatio: diffCount / pixelCount}
}
