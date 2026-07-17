import {describe, expect, it} from 'vitest'
import {BRAND, WORDMARK_PREFIX, WORDMARK_REST} from './brand'

describe('BRAND', () => {
    it('사이트명은 OnTool이다', () => {
        expect(BRAND.siteName).toBe('OnTool')
    })

    it('워드마크는 소문자 ontool이다', () => {
        expect(BRAND.wordmark).toBe('ontool')
    })

    it('한글 병기명은 온툴이다', () => {
        expect(BRAND.koreanName).toBe('온툴')
    })

    it('슬로건은 "모든 도구, 한 곳에"이다', () => {
        expect(BRAND.slogan).toBe('모든 도구, 한 곳에')
    })

    it('WORDMARK_PREFIX+WORDMARK_REST를 합치면 워드마크 전체와 같다 (DESIGN.md §0: on은 primary, tool은 foreground)', () => {
        expect(WORDMARK_PREFIX).toBe('on')
        expect(WORDMARK_REST).toBe('tool')
        expect(WORDMARK_PREFIX + WORDMARK_REST).toBe(BRAND.wordmark)
    })
})
