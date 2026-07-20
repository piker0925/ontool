import {describe, expect, it} from 'vitest'
import {applyColorblindFilter, type PixelBuffer} from './colorblindSim'

function pixel(r: number, g: number, b: number, a = 255): PixelBuffer {
    return {width: 1, height: 1, data: new Uint8ClampedArray([r, g, b, a])}
}

describe('applyColorblindFilter', () => {
    it('빨강과 초록은 protanopia 필터를 거치면 항등변환이 아니라 실제로 값이 바뀐다', () => {
        const red = pixel(255, 0, 0)
        const green = pixel(0, 255, 0)

        const redResult = applyColorblindFilter(red, 'protanopia')
        const greenResult = applyColorblindFilter(green, 'protanopia')

        expect(Array.from(redResult.data.slice(0, 3))).not.toEqual([255, 0, 0])
        expect(Array.from(greenResult.data.slice(0, 3))).not.toEqual([0, 255, 0])
    })

    it('알파 채널은 그대로 유지된다', () => {
        const translucentRed = pixel(255, 0, 0, 128)

        const result = applyColorblindFilter(translucentRed, 'deuteranopia')

        expect(result.data[3]).toBe(128)
    })
})
