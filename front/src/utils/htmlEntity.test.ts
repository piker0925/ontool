import {describe, expect, it} from 'vitest'
import {decodeHtmlEntities, encodeHtmlEntities} from './htmlEntity'

describe('encodeHtmlEntities', () => {
    it('HTML 특수문자를 엔티티로', () => {
        const out = encodeHtmlEntities('<div class="x">a & b</div>')
        expect(out).toContain('&lt;')
        expect(out).toContain('&gt;')
        expect(out).toContain('&amp;')
        expect(out).toContain('&quot;')
        expect(out).not.toContain('<div')  // 원본 태그가 그대로 남지 않음
    })

    it('비ASCII를 named reference로 (é → &eacute;)', () => {
        expect(encodeHtmlEntities('é')).toBe('&eacute;')
    })
})

describe('decodeHtmlEntities', () => {
    it('named·numeric 엔티티를 디코드 (독립 기준값)', () => {
        expect(decodeHtmlEntities('&lt;a&gt; &amp; &eacute; &#65;')).toBe('<a> & é A')
    })
})

describe('라운드트립', () => {
    it('decode(encode(x)) == x, 인코드 결과는 원본과 다름', () => {
        const x = '<script>alert("é & 안녕")</script>'
        const enc = encodeHtmlEntities(x)
        expect(enc).not.toBe(x)  // 실제로 인코딩됐는지 (아무 일도 안 하는 구현 방지)
        expect(decodeHtmlEntities(enc)).toBe(x)
    })
})
