import {describe, expect, it} from 'vitest'
import {bytesToBase64} from './bytes'
import {bytesToDataUri, dataUriToBytes, normalizeToDataUri} from './imageBase64'

describe('bytesToDataUri / dataUriToBytes — 바이트 라운드트립', () => {
    it('PNG 헤더 바이트가 data URI를 거쳐도 정확히 동일하게 복원된다', () => {
        // 실제 PNG 시그니처 바이트 일부 + 임의 바이트(경계값 0, 255 포함)
        const original = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 1, 2, 254, 255])
        const uri = bytesToDataUri(original, 'image/png')
        expect(uri.startsWith('data:image/png;base64,')).toBe(true)
        expect(Array.from(dataUriToBytes(uri))).toEqual(Array.from(original))
    })

    it('서로 다른 바이트 배열은 라운드트립 후에도 서로 다르다 (동어반복 아님)', () => {
        const a = bytesToDataUri(new Uint8Array([1, 2, 3]), 'image/png')
        const b = bytesToDataUri(new Uint8Array([1, 2, 4]), 'image/png')
        expect(dataUriToBytes(a)).not.toEqual(dataUriToBytes(b))
    })

    it('mime 타입이 data URI에 그대로 반영된다', () => {
        expect(bytesToDataUri(new Uint8Array([0]), 'image/jpeg')).toContain('data:image/jpeg;base64,')
    })
})

describe('normalizeToDataUri', () => {
    it('이미 data URI면 그대로 통과', () => {
        const uri = bytesToDataUri(new Uint8Array([9, 9, 9]), 'image/png')
        expect(normalizeToDataUri(uri)).toBe(uri)
    })

    it('순수 base64 문자열(접두어 없음)은 fallback mime의 data URI로 감싸지고, 바이트는 원본과 동일하게 복원된다', () => {
        const original = new Uint8Array([10, 20, 30, 255])
        const rawBase64 = bytesToBase64(original)
        const normalized = normalizeToDataUri(rawBase64, 'image/png')
        expect(normalized).toBe(`data:image/png;base64,${rawBase64}`)
        expect(Array.from(dataUriToBytes(normalized))).toEqual(Array.from(original))
    })

    it('앞뒤 공백은 무시한다', () => {
        const uri = bytesToDataUri(new Uint8Array([1]), 'image/png')
        expect(normalizeToDataUri(`  ${uri}  `)).toBe(uri)
    })
})
