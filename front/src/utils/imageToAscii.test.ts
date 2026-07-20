import {describe, expect, it} from 'vitest'
import {ASCII_CHARSET_PRESETS, DEFAULT_CHARSET, imageToAscii, type PixelBuffer} from './imageToAscii'

function solidColor(width: number, height: number, r: number, g: number, b: number): PixelBuffer {
    const data = new Uint8ClampedArray(width * height * 4)
    for (let i = 0; i < width * height; i++) {
        data.set([r, g, b, 255], i * 4)
    }
    return {width, height, data}
}

describe('imageToAscii', () => {
    it('출력의 각 줄 문자 수가 지정한 가로 해상도와 일치한다', () => {
        const image = solidColor(8, 8, 128, 128, 128)

        const ascii = imageToAscii(image, 4)

        const lines = ascii.split('\n')
        expect(lines.length).toBeGreaterThan(0)
        for (const line of lines) {
            expect(line.length).toBe(4)
        }
    })

    it('완전히 검은 이미지와 완전히 흰 이미지는 서로 다른 문자로 렌더된다', () => {
        const black = solidColor(4, 4, 0, 0, 0)
        const white = solidColor(4, 4, 255, 255, 255)

        const blackAscii = imageToAscii(black, 2)
        const whiteAscii = imageToAscii(white, 2)

        expect(blackAscii).not.toBe(whiteAscii)
        expect(blackAscii.trim()).not.toBe('')
        expect(blackAscii[0]).toBe(DEFAULT_CHARSET[DEFAULT_CHARSET.length - 1])
        expect(whiteAscii[0]).toBe(DEFAULT_CHARSET[0])
    })

    it('문자셋을 바꾸면 같은 이미지도 다른 문자로 렌더된다', () => {
        const gray = solidColor(2, 2, 128, 128, 128)

        const withDefault = imageToAscii(gray, 2, ASCII_CHARSET_PRESETS[0].charset)
        const withAlt = imageToAscii(gray, 2, ASCII_CHARSET_PRESETS[1].charset)

        expect(withDefault).not.toBe(withAlt)
    })
})

describe('ASCII_CHARSET_PRESETS', () => {
    it('모든 프리셋이 고유 id와 2자 이상의 문자셋을 가진다', () => {
        expect(ASCII_CHARSET_PRESETS.length).toBeGreaterThan(1)

        const ids = ASCII_CHARSET_PRESETS.map(p => p.id)
        expect(new Set(ids).size).toBe(ids.length)

        for (const preset of ASCII_CHARSET_PRESETS) {
            expect(preset.charset.length).toBeGreaterThan(1)
        }
    })
})
