import {describe, expect, it} from 'vitest'
import {decodeBase64, decodeUrl, encodeBase64, encodeUrl} from './encoding'

describe('Base64', () => {
    it('인코딩', () => {
        expect(encodeBase64('hello')).toBe('aGVsbG8=')
    })
    it('디코딩', () => {
        expect(decodeBase64('aGVsbG8=')).toBe('hello')
    })
    it('한글 인코딩/디코딩 왕복', () => {
        const text = '안녕하세요'
        expect(decodeBase64(encodeBase64(text))).toBe(text)
    })
})

describe('URL 인코딩', () => {
    it('인코딩', () => {
        expect(encodeUrl('hello world')).toBe('hello%20world')
    })
    it('디코딩', () => {
        expect(decodeUrl('hello%20world')).toBe('hello world')
    })
    it('특수문자 왕복', () => {
        const text = '한글 & 특수문자=값'
        expect(decodeUrl(encodeUrl(text))).toBe(text)
    })
})
