import {hexToRgb, hslToRgb, rgbToHex, rgbToHsl} from './colorCode'

export type PaletteRule = 'complementary' | 'analogous' | 'triadic' | 'monochromatic'

const SATURATION = 65
const LIGHTNESS = 55

function hueToHex(h: number, s: number, l: number): string {
    const {r, g, b} = hslToRgb(((h % 360) + 360) % 360, s, l)
    return rgbToHex(r, g, b)
}

/**
 * 규칙 기반으로 조화로운 색상 팔레트를 생성한다.
 * baseHex를 지정하면 그 색의 색상각·채도·명도를 기준으로 삼고(그 색 자체는 결과에 그대로 포함),
 * 지정하지 않으면 매번 무작위 색상각에서 생성한다.
 */
export function generatePalette(rule: PaletteRule, baseHex?: string): string[] {
    let baseHue: number
    let saturation: number
    let lightness: number
    let exactBase: string | null = null

    if (baseHex) {
        const {r, g, b} = hexToRgb(baseHex)
        const hsl = rgbToHsl(r, g, b)
        baseHue = hsl.h
        saturation = hsl.s
        lightness = hsl.l
        exactBase = rgbToHex(r, g, b)
    } else {
        baseHue = Math.floor(Math.random() * 360)
        saturation = SATURATION
        lightness = LIGHTNESS
    }

    function atOffset(offset: number): string {
        if (offset === 0 && exactBase) return exactBase
        return hueToHex(baseHue + offset, saturation, lightness)
    }

    switch (rule) {
        case 'complementary':
            return [atOffset(0), atOffset(180)]
        case 'analogous':
            return [-30, 0, 30].map(atOffset)
        case 'triadic':
            return [0, 120, 240].map(atOffset)
        case 'monochromatic':
            // 가운데(55) 자리를 기준 색 그대로 채운다 — 다른 규칙과 동일하게 "지정한 색이 결과에 그대로 포함" 보장.
            return [30, 45, 55, 65, 80].map(l => (l === 55 && exactBase) ? exactBase : hueToHex(baseHue, saturation, l))
    }
}
