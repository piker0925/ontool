import {describe, expect, it} from 'vitest'
import {convertKeyboard, countChars, normalizeWhitespace} from './textUtils'

describe('countChars', () => {
    it('문자 수, 단어 수, 바이트 수 반환', () => {
        const result = countChars('hello world')
        expect(result.chars).toBe(11)
        expect(result.words).toBe(2)
        expect(result.bytes).toBe(11)
    })
    it('한글 바이트 수 (UTF-8: 3바이트)', () => {
        const result = countChars('안녕')
        expect(result.chars).toBe(2)
        expect(result.bytes).toBe(6)
    })
    it('빈 문자열', () => {
        const result = countChars('')
        expect(result.chars).toBe(0)
        expect(result.words).toBe(0)
        expect(result.bytes).toBe(0)
    })
})

describe('convertKeyboard', () => {
    it('영어 → 한글 기본 (받침 없음)', () => {
        expect(convertKeyboard('rk', 'en-ko')).toBe('가')
    })
    it('한글 → 영어 기본', () => {
        expect(convertKeyboard('가', 'ko-en')).toBe('rk')
    })
    it('영어 → 한글 받침 있음', () => {
        // rkr = ㄱ+ㅏ+ㄱ = 각
        expect(convertKeyboard('rkr', 'en-ko')).toBe('각')
    })
    it('한글 → 영어 받침 있음', () => {
        expect(convertKeyboard('각', 'ko-en')).toBe('rkr')
    })
    it('영어 → 한글 받침이 다음 음절 초성으로 이동', () => {
        // rkrk = ㄱ+ㅏ+[ㄱ tentative jong]+ㅏ → 가+가 (jong splits to next cho)
        expect(convertKeyboard('rkrk', 'en-ko')).toBe('가가')
    })
    it('영어 → 한글 단어 (한글)', () => {
        expect(convertKeyboard('gksrmf', 'en-ko')).toBe('한글')
    })
    it('한글 → 영어 단어 (한글)', () => {
        expect(convertKeyboard('한글', 'ko-en')).toBe('gksrmf')
    })
    it('영어 → 한글 복합 모음 (화)', () => {
        // ghk = ㅎ+ㅗ+ㅏ → ㅗ+ㅏ가 결합모음 ㅘ가 되어 화
        expect(convertKeyboard('ghk', 'en-ko')).toBe('화')
    })
    it('한글 → 영어 복합 모음 분해 (화)', () => {
        expect(convertKeyboard('화', 'ko-en')).toBe('ghk')
    })
    it('영어 → 한글 복합 받침 (값)', () => {
        // rkqt = ㄱ+ㅏ+ㅂ+ㅅ → ㅂ+ㅅ가 결합받침 ㅄ이 되어 값
        expect(convertKeyboard('rkqt', 'en-ko')).toBe('값')
    })
    it('한글 → 영어 복합 받침 분해 (값)', () => {
        expect(convertKeyboard('값', 'ko-en')).toBe('rkqt')
    })
    it('영어 → 한글 복합 받침 뒤에 모음이 오면 마지막 자모만 다음 음절 초성으로 이동 (달구)', () => {
        // ekfrn = ㄷ+ㅏ+ㄹ+ㄱ+ㅜ → ㄹ+ㄱ이 결합받침 ㄺ으로 임시 확정되지만,
        // 모음 ㅜ가 오면 ㄺ의 마지막 자모(ㄱ)만 다음 음절 초성으로 이동하고 ㄹ은 받침으로 남아 "달구"
        expect(convertKeyboard('ekfrn', 'en-ko')).toBe('달구')
    })
})

describe('normalizeWhitespace', () => {
    it('연속 공백을 단일 공백으로', () => {
        expect(normalizeWhitespace('a  b   c')).toBe('a b c')
    })
    it('앞뒤 공백 제거', () => {
        expect(normalizeWhitespace('  hello  ')).toBe('hello')
    })
    it('탭을 공백으로', () => {
        expect(normalizeWhitespace('a\tb')).toBe('a b')
    })
    it('연속 줄바꿈 정규화', () => {
        expect(normalizeWhitespace('a\n\n\nb')).toBe('a\nb')
    })
})
