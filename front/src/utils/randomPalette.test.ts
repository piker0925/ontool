import {describe, expect, it} from 'vitest'
import {rgbToHsl, hexToRgb} from './colorCode'
import {generatePalette} from './randomPalette'

function hueOf(hex: string): number {
    const {r, g, b} = hexToRgb(hex)
    return rgbToHsl(r, g, b).h
}

function hueDiff(a: number, b: number): number {
    const diff = Math.abs(a - b) % 360
    return Math.min(diff, 360 - diff)
}

describe('generatePalette', () => {
    it('생성된 색상들은 서로 다른 hex 값이다', () => {
        const palette = generatePalette('complementary')
        expect(new Set(palette).size).toBe(palette.length)
    })

    it('보색(complementary) 규칙: 두 색의 색상각 차이가 약 180도다', () => {
        for (let trial = 0; trial < 20; trial++) {
            const [a, b] = generatePalette('complementary')
            expect(hueDiff(hueOf(a), hueOf(b))).toBeGreaterThanOrEqual(170)
            expect(hueDiff(hueOf(a), hueOf(b))).toBeLessThanOrEqual(190)
        }
    })

    it('유사색(analogous) 규칙: 인접 색상 간 색상각 차이가 40도 이내다', () => {
        for (let trial = 0; trial < 20; trial++) {
            const palette = generatePalette('analogous')
            const hues = palette.map(hueOf)
            for (let i = 1; i < hues.length; i++) {
                expect(hueDiff(hues[i], hues[i - 1])).toBeLessThanOrEqual(40)
            }
        }
    })

    it('여러 번 생성하면 색상각(base hue)이 매번 고정되지 않고 달라진다', () => {
        const hues = Array.from({length: 10}, () => hueOf(generatePalette('complementary')[0]))
        expect(new Set(hues).size).toBeGreaterThan(1)
    })

    it('삼색조(triadic) 규칙: 세 색이 서로 약 120도씩 떨어져 있다', () => {
        for (let trial = 0; trial < 20; trial++) {
            const hues = generatePalette('triadic').map(hueOf)
            expect(hues).toHaveLength(3)
            for (let i = 0; i < 3; i++) {
                const diff = hueDiff(hues[i], hues[(i + 1) % 3])
                expect(diff).toBeGreaterThanOrEqual(110)
                expect(diff).toBeLessThanOrEqual(130)
            }
        }
    })

    it('모노톤(monochromatic) 규칙: 모든 색상이 같은 색상각을 공유하고 명도만 다르다', () => {
        for (let trial = 0; trial < 20; trial++) {
            const palette = generatePalette('monochromatic')
            const hues = palette.map(hueOf)
            for (let i = 1; i < hues.length; i++) {
                expect(hueDiff(hues[i], hues[0])).toBeLessThanOrEqual(2)
            }
            expect(new Set(palette).size).toBe(palette.length)
        }
    })
})
