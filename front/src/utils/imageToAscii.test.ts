import {describe, expect, it} from 'vitest'
import {ASCII_CHARSET_PRESETS, DEFAULT_CHARSET, imageToAscii, type PixelBuffer} from './imageToAscii'

function solidColor(width: number, height: number, r: number, g: number, b: number): PixelBuffer {
    const data = new Uint8ClampedArray(width * height * 4)
    for (let i = 0; i < width * height; i++) {
        data.set([r, g, b, 255], i * 4)
    }
    return {width, height, data}
}

/** 가로 1줄, 픽셀마다 흰색→검정으로 균등하게 어두워지는 그레이스케일 그라데이션. */
function grayscaleGradient(steps: number): PixelBuffer {
    const data = new Uint8ClampedArray(steps * 4)
    for (let i = 0; i < steps; i++) {
        const gray = Math.round(255 - (i * 255) / (steps - 1))
        data.set([gray, gray, gray, 255], i * 4)
    }
    return {width: steps, height: 1, data}
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

    it('이진(2문자) 프리셋에서 순수 검정이 아닌 어두운 회색도 채워진 문자로 렌더된다 (버그 회귀)', () => {
        // 순수 검정(0,0,0)이 아니지만 충분히 어두운 회색 — 기존 버그는 순수 검정 아니면
        // 전부 공백(idx 0)으로 떨어져 실사진 변환 시 화면이 텅 비어 보였다
        const darkGray = solidColor(2, 2, 60, 60, 60)
        const binaryCharset = ASCII_CHARSET_PRESETS.find(p => p.id === 'binary')!.charset

        const ascii = imageToAscii(darkGray, 2, binaryCharset)

        expect(ascii.trim()).not.toBe('')
        expect(ascii[0]).toBe(binaryCharset[binaryCharset.length - 1])
    })

    it.each(ASCII_CHARSET_PRESETS.map(p => [p.id, p.charset] as const))(
        '%s 프리셋 — 흑백 그라데이션을 주면 문자셋의 모든 문자가 고르게 등장한다 (분포 회귀)',
        (_id, charset) => {
            const gradient = grayscaleGradient(charset.length)

            const ascii = imageToAscii(gradient, charset.length, charset)

            const usedChars = new Set(ascii.replace(/\n/g, ''))
            expect(usedChars.size).toBe(charset.length)
            for (const ch of charset) {
                expect(usedChars.has(ch)).toBe(true)
            }
        },
    )
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
