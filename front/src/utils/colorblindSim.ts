export type ColorblindType = 'protanopia' | 'deuteranopia' | 'tritanopia'

export interface PixelBuffer {
    width: number
    height: number
    data: Uint8ClampedArray<ArrayBuffer>
}

// 3x3 RGB 변환 행렬 (Vienot 1999 / Coblis 계열 근사치)
const MATRICES: Record<ColorblindType, number[]> = {
    protanopia: [0.567, 0.433, 0, 0.558, 0.442, 0, 0, 0.242, 0.758],
    deuteranopia: [0.625, 0.375, 0, 0.7, 0.3, 0, 0, 0.3, 0.7],
    tritanopia: [0.95, 0.05, 0, 0, 0.433, 0.567, 0, 0.475, 0.525],
}

/** 색약 변환 행렬을 캔버스 픽셀 버퍼에 적용해 시뮬레이션 결과를 만든다. */
export function applyColorblindFilter(source: PixelBuffer, type: ColorblindType): PixelBuffer {
    const m = MATRICES[type]
    const data = new Uint8ClampedArray(source.data.length)

    for (let i = 0; i < source.data.length; i += 4) {
        const r = source.data[i]
        const g = source.data[i + 1]
        const b = source.data[i + 2]

        data[i] = m[0] * r + m[1] * g + m[2] * b
        data[i + 1] = m[3] * r + m[4] * g + m[5] * b
        data[i + 2] = m[6] * r + m[7] * g + m[8] * b
        data[i + 3] = source.data[i + 3]
    }

    return {width: source.width, height: source.height, data}
}
