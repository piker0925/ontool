export function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const clean = hex.replace('#', '')
    if (!/^[0-9a-fA-F]{6}$/.test(clean)) throw new Error('올바른 HEX 색상이 아닙니다.')
    const n = parseInt(clean, 16)
    return {r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff}
}

export function rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
}

export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    const rn = r / 255, gn = g / 255, bn = b / 255
    const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
    const l = (max + min) / 2
    if (max === min) return {h: 0, s: 0, l: Math.round(l * 100)}
    const d = max - min
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    let h = 0
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6
    else if (max === gn) h = ((bn - rn) / d + 2) / 6
    else h = ((rn - gn) / d + 4) / 6
    return {h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100)}
}

export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    const sn = s / 100, ln = l / 100
    const c = (1 - Math.abs(2 * ln - 1)) * sn
    const x = c * (1 - Math.abs((h / 60) % 2 - 1))
    const m = ln - c / 2
    let rn = 0, gn = 0, bn = 0
    if (h < 60) {
        rn = c;
        gn = x
    } else if (h < 120) {
        rn = x;
        gn = c
    } else if (h < 180) {
        gn = c;
        bn = x
    } else if (h < 240) {
        gn = x;
        bn = c
    } else if (h < 300) {
        rn = x;
        bn = c
    } else {
        rn = c;
        bn = x
    }
    return {
        r: Math.round((rn + m) * 255),
        g: Math.round((gn + m) * 255),
        b: Math.round((bn + m) * 255),
    }
}

export interface Rgba {
    r: number;
    g: number;
    b: number;
    a: number
}

/**
 * 색상 문자열 파싱: #RGB/#RGBA/#RRGGBB/#RRGGBBAA, rgb()/rgba(), hsl()/hsla() 지원.
 * a는 0~1 범위.
 */
export function parseColor(input: string): Rgba {
    const str = input.trim()

    const hexMatch = str.match(/^#?([0-9a-fA-F]{3,8})$/)
    if (hexMatch) {
        let hex = hexMatch[1]
        if (hex.length === 3 || hex.length === 4) {
            hex = hex.split('').map(c => c + c).join('')
        }
        if (hex.length === 6) hex += 'ff'
        if (hex.length !== 8) throw new Error('올바른 HEX 색상이 아닙니다.')
        return {
            r: parseInt(hex.slice(0, 2), 16),
            g: parseInt(hex.slice(2, 4), 16),
            b: parseInt(hex.slice(4, 6), 16),
            a: Math.round(parseInt(hex.slice(6, 8), 16) / 255 * 1000) / 1000,
        }
    }

    const rgbMatch = str.match(/^rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*(?:[,/]\s*([\d.]+%?)\s*)?\)$/i)
    if (rgbMatch) {
        const [r, g, b] = [rgbMatch[1], rgbMatch[2], rgbMatch[3]].map(Number)
        if ([r, g, b].some(v => v > 255)) throw new Error('RGB 값은 0~255 범위여야 합니다.')
        return {r, g, b, a: parseAlpha(rgbMatch[4])}
    }

    const hslMatch = str.match(/^hsla?\(\s*(\d{1,3}(?:\.\d+)?)\s*[, ]\s*([\d.]+)%\s*[, ]\s*([\d.]+)%\s*(?:[,/]\s*([\d.]+%?)\s*)?\)$/i)
    if (hslMatch) {
        const h = Number(hslMatch[1]), s = Number(hslMatch[2]), l = Number(hslMatch[3])
        if (h > 360 || s > 100 || l > 100) throw new Error('HSL 값 범위가 올바르지 않습니다.')
        const {r, g, b} = hslToRgb(h % 360, s, l)
        return {r, g, b, a: parseAlpha(hslMatch[4])}
    }

    throw new Error('지원하지 않는 색상 형식입니다. 예: #ff0000, #ff000080, rgb(255, 0, 0), hsl(0, 100%, 50%)')
}

function parseAlpha(raw: string | undefined): number {
    if (raw === undefined) return 1
    const value = raw.endsWith('%') ? Number(raw.slice(0, -1)) / 100 : Number(raw)
    if (isNaN(value) || value < 0 || value > 1) throw new Error('알파 값은 0~1 범위여야 합니다.')
    return Math.round(value * 1000) / 1000
}

/** RGBA → HEX. a<1이면 8자리(#RRGGBBAA), 아니면 6자리(#RRGGBB). */
export function rgbaToHex(r: number, g: number, b: number, a = 1): string {
    const base = rgbToHex(r, g, b)
    if (a >= 1) return base
    return base + Math.round(a * 255).toString(16).padStart(2, '0')
}

export function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
    const rn = r / 255, gn = g / 255, bn = b / 255
    const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
    const d = max - min
    let h = 0
    if (d !== 0) {
        if (max === rn) h = (((gn - bn) / d) % 6 + 6) % 6 / 6
        else if (max === gn) h = ((bn - rn) / d + 2) / 6
        else h = ((rn - gn) / d + 4) / 6
    }
    const s = max === 0 ? 0 : d / max
    return {h: Math.round(h * 360), s: Math.round(s * 100), v: Math.round(max * 100)}
}

/** WCAG 상대 휘도 (0~1). */
export function relativeLuminance(r: number, g: number, b: number): number {
    const lin = (v: number) => {
        const c = v / 255
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    }
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

/** WCAG 대비율 (1~21, 소수 둘째 자리 반올림). */
export function contrastRatio(c1: { r: number; g: number; b: number }, c2: { r: number; g: number; b: number }): number {
    const l1 = relativeLuminance(c1.r, c1.g, c1.b)
    const l2 = relativeLuminance(c2.r, c2.g, c2.b)
    const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1]
    return Math.round((hi + 0.05) / (lo + 0.05) * 100) / 100
}

/** 알파를 배경색 위에 합성한 불투명 색상을 반환한다. */
export function compositeOnBackground(fg: Rgba, bg: { r: number; g: number; b: number }): { r: number; g: number; b: number } {
    const blend = (f: number, back: number) => Math.round(f * fg.a + back * (1 - fg.a))
    return {r: blend(fg.r, bg.r), g: blend(fg.g, bg.g), b: blend(fg.b, bg.b)}
}

export interface WcagLevels {
    aa: boolean;        // 일반 텍스트 AA (>= 4.5)
    aaa: boolean;       // 일반 텍스트 AAA (>= 7)
    aaLarge: boolean;   // 큰 텍스트 AA (>= 3)
}

export function wcagLevels(ratio: number): WcagLevels {
    return {aa: ratio >= 4.5, aaa: ratio >= 7, aaLarge: ratio >= 3}
}

export interface PaletteContrastPair {
    /** colors 배열의 인덱스 */
    a: number
    b: number
    ratio: number
    levels: WcagLevels
}

/** 팔레트의 모든 색상 조합(중복 없는 쌍)의 WCAG 대비를 계산한다. 알파는 흰 배경에 합성해 불투명화한다. */
export function paletteContrastPairs(colors: Rgba[]): PaletteContrastPair[] {
    const white = {r: 255, g: 255, b: 255}
    const opaque = colors.map(c => compositeOnBackground(c, white))
    const pairs: PaletteContrastPair[] = []
    for (let i = 0; i < colors.length; i++) {
        for (let j = i + 1; j < colors.length; j++) {
            const ratio = contrastRatio(opaque[i], opaque[j])
            pairs.push({a: i, b: j, ratio, levels: wcagLevels(ratio)})
        }
    }
    return pairs
}
