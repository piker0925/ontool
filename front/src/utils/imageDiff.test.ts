import {describe, expect, it} from 'vitest'
import {diffImages, type PixelBuffer} from './imageDiff'

function buffer(width: number, height: number, pixels: number[][]): PixelBuffer {
    const data = new Uint8ClampedArray(width * height * 4)
    pixels.forEach(([r, g, b, a], i) => {
        data.set([r, g, b, a ?? 255], i * 4)
    })
    return {width, height, data}
}

describe('diffImages', () => {
    it('완전히 동일한 두 이미지는 차이 0%', () => {
        const a = buffer(2, 2, [[10, 20, 30], [40, 50, 60], [70, 80, 90], [100, 110, 120]])
        const b = buffer(2, 2, [[10, 20, 30], [40, 50, 60], [70, 80, 90], [100, 110, 120]])

        const result = diffImages(a, b)

        expect(result.diffRatio).toBe(0)
    })

    it('4픽셀 중 1픽셀만 다르면 차이 25%로 정확히 표시', () => {
        const a = buffer(2, 2, [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]])
        const b = buffer(2, 2, [[255, 255, 255], [0, 0, 0], [0, 0, 0], [0, 0, 0]])

        const result = diffImages(a, b)

        expect(result.diffRatio).toBe(0.25)
    })

    it('크기가 다른 두 이미지는 비교할 수 없다', () => {
        const a = buffer(2, 2, [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]])
        const b = buffer(1, 1, [[0, 0, 0]])

        expect(() => diffImages(a, b)).toThrow()
    })
})
