import {describe, expect, it} from 'vitest'
import {decodeIcoSizes, encodeIco} from './faviconGen'

function fakePng(bytes: number): Uint8Array {
    return new Uint8Array(bytes).fill(0xAB)
}

describe('encodeIco / decodeIcoSizes', () => {
    it('여러 사이즈를 ICO로 인코딩한 뒤 디코딩하면 지정한 모든 사이즈가 그대로 포함되어 있다', () => {
        const images = [
            {size: 16, pngData: fakePng(50)},
            {size: 32, pngData: fakePng(120)},
            {size: 48, pngData: fakePng(200)},
            {size: 180, pngData: fakePng(900)},
        ]

        const ico = encodeIco(images)
        const sizes = decodeIcoSizes(ico)

        expect(sizes.sort((a, b) => a - b)).toEqual([16, 32, 48, 180])
    })

    it('사이즈 하나만 넣으면 디코딩 결과도 하나뿐이다', () => {
        const ico = encodeIco([{size: 32, pngData: fakePng(64)}])

        expect(decodeIcoSizes(ico)).toEqual([32])
    })
})
