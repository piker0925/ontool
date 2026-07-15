import {describe, expect, it} from 'vitest'
import {
    compositeOnBackground,
    contrastRatio,
    hexToRgb,
    hslToRgb,
    parseColor,
    rgbaToHex,
    rgbToHex,
    rgbToHsl,
    rgbToHsv,
    wcagLevels,
} from './colorCode'

describe('색상 코드', () => {
    it('HEX → RGB', () => {
        expect(hexToRgb('#ff0000')).toEqual({r: 255, g: 0, b: 0})
    })
    it('HEX 소문자 처리', () => {
        expect(hexToRgb('#ffffff')).toEqual({r: 255, g: 255, b: 255})
    })
    it('잘못된 HEX는 에러', () => {
        expect(() => hexToRgb('gg0000')).toThrow()
    })
    it('RGB → HEX', () => {
        expect(rgbToHex(255, 0, 0)).toBe('#ff0000')
    })
    it('RGB → HSL (빨강)', () => {
        const {h, s, l} = rgbToHsl(255, 0, 0)
        expect(h).toBe(0)
        expect(s).toBe(100)
        expect(l).toBe(50)
    })
    it('HSL → RGB (빨강)', () => {
        expect(hslToRgb(0, 100, 50)).toEqual({r: 255, g: 0, b: 0})
    })
})

describe('parseColor', () => {
    it('#RRGGBB → 알파 1', () => {
        expect(parseColor('#ff0000')).toEqual({r: 255, g: 0, b: 0, a: 1})
    })
    it('#RRGGBBAA → 알파 파싱 (0x80 = 0.502)', () => {
        expect(parseColor('#ff000080')).toEqual({r: 255, g: 0, b: 0, a: 0.502})
    })
    it('3자리 축약 HEX', () => {
        expect(parseColor('#f00')).toEqual({r: 255, g: 0, b: 0, a: 1})
    })
    it('rgb() 문자열', () => {
        expect(parseColor('rgb(99, 102, 241)')).toEqual({r: 99, g: 102, b: 241, a: 1})
    })
    it('rgba() 문자열', () => {
        expect(parseColor('rgba(255, 0, 0, 0.5)')).toEqual({r: 255, g: 0, b: 0, a: 0.5})
    })
    it('hsl() 문자열 → RGB 변환', () => {
        expect(parseColor('hsl(0, 100%, 50%)')).toEqual({r: 255, g: 0, b: 0, a: 1})
        expect(parseColor('hsl(240, 100%, 50%)')).toEqual({r: 0, g: 0, b: 255, a: 1})
    })
    it('hsla() 문자열', () => {
        expect(parseColor('hsla(0, 100%, 50%, 0.25)')).toEqual({r: 255, g: 0, b: 0, a: 0.25})
    })
    it('잘못된 형식은 에러', () => {
        expect(() => parseColor('notacolor')).toThrow()
        expect(() => parseColor('rgb(999, 0, 0)')).toThrow()
        expect(() => parseColor('#12345')).toThrow()
    })
})

describe('rgbaToHex', () => {
    it('알파 1이면 6자리', () => {
        expect(rgbaToHex(255, 0, 0, 1)).toBe('#ff0000')
    })
    it('알파 0.5면 8자리', () => {
        expect(rgbaToHex(255, 0, 0, 0.5)).toBe('#ff000080')
    })
})

describe('rgbToHsv', () => {
    it('빨강 → hsv(0, 100%, 100%)', () => {
        expect(rgbToHsv(255, 0, 0)).toEqual({h: 0, s: 100, v: 100})
    })
    it('파랑 → hsv(240, 100%, 100%)', () => {
        expect(rgbToHsv(0, 0, 255)).toEqual({h: 240, s: 100, v: 100})
    })
    it('회색 → 채도 0', () => {
        expect(rgbToHsv(128, 128, 128)).toEqual({h: 0, s: 0, v: 50})
    })
    it('HSL과 값이 다른 케이스 (HSV v=100, HSL l=50)', () => {
        // 순색에서 HSV value는 100, HSL lightness는 50 — 두 모델이 실제로 구분되는지 확인
        const hsv = rgbToHsv(255, 0, 0)
        const hsl = rgbToHsl(255, 0, 0)
        expect(hsv.v).toBe(100)
        expect(hsl.l).toBe(50)
    })
})

describe('WCAG 대비', () => {
    it('흰색 vs 검정 = 21:1', () => {
        expect(contrastRatio({r: 255, g: 255, b: 255}, {r: 0, g: 0, b: 0})).toBe(21)
    })
    it('같은 색 = 1:1', () => {
        expect(contrastRatio({r: 128, g: 128, b: 128}, {r: 128, g: 128, b: 128})).toBe(1)
    })
    it('빨강 vs 흰색 ≈ 4:1 (독립 기준값)', () => {
        expect(contrastRatio({r: 255, g: 0, b: 0}, {r: 255, g: 255, b: 255})).toBeCloseTo(4, 1)
    })
    it('레벨 판정: 21 → AA/AAA/AA-Large 모두 통과', () => {
        expect(wcagLevels(21)).toEqual({aa: true, aaa: true, aaLarge: true})
    })
    it('레벨 판정: 4.5 → AA 통과, AAA 실패', () => {
        expect(wcagLevels(4.5)).toEqual({aa: true, aaa: false, aaLarge: true})
    })
    it('레벨 판정: 2 → 전부 실패', () => {
        expect(wcagLevels(2)).toEqual({aa: false, aaa: false, aaLarge: false})
    })
    it('알파 합성: 50% 검정을 흰 배경에 → 회색(128 근처)', () => {
        const result = compositeOnBackground({r: 0, g: 0, b: 0, a: 0.5}, {r: 255, g: 255, b: 255})
        expect(result).toEqual({r: 128, g: 128, b: 128})
    })
    it('알파 합성: 완전 불투명이면 배경 무시', () => {
        const result = compositeOnBackground({r: 10, g: 20, b: 30, a: 1}, {r: 255, g: 255, b: 255})
        expect(result).toEqual({r: 10, g: 20, b: 30})
    })
})
