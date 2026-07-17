import {describe, expect, it} from 'vitest'
import {readImageDimensions} from './imageDimensions'

// 실제 이미지 디코딩 경로(Image.onload)는 jsdom이 지원하지 않아 브라우저 전용으로 남긴다.
// 여기서는 Image를 건드리기 전에 조기 반환하는 "이미지가 아닌 파일" 분기만 검증한다.
describe('readImageDimensions', () => {
    it('MIME 타입이 image/*가 아니면 Image를 만들지 않고 즉시 null을 반환한다', async () => {
        const file = new File(['%PDF-1.4'], 'doc.pdf', {type: 'application/pdf'})

        const result = await readImageDimensions(file)

        expect(result).toBeNull()
    })
})
