import {hslToRgb, rgbToHex} from './colorCode'

export type PaletteRule = 'complementary' | 'analogous' | 'triadic' | 'monochromatic'

const SATURATION = 65
const LIGHTNESS = 55

function hueToHex(h: number, s: number, l: number): string {
    const {r, g, b} = hslToRgb(((h % 360) + 360) % 360, s, l)
    return rgbToHex(r, g, b)
}

/** 규칙 기반으로 조화로운 색상 팔레트를 무작위 생성한다 (hue는 매번 랜덤). */
export function generatePalette(rule: PaletteRule): string[] {
    const baseHue = Math.floor(Math.random() * 360)

    switch (rule) {
        case 'complementary':
            return [hueToHex(baseHue, SATURATION, LIGHTNESS), hueToHex(baseHue + 180, SATURATION, LIGHTNESS)]
        case 'analogous':
            return [-30, 0, 30].map(offset => hueToHex(baseHue + offset, SATURATION, LIGHTNESS))
        case 'triadic':
            return [0, 120, 240].map(offset => hueToHex(baseHue + offset, SATURATION, LIGHTNESS))
        case 'monochromatic':
            return [30, 45, 55, 65, 80].map(l => hueToHex(baseHue, SATURATION, l))
    }
}
