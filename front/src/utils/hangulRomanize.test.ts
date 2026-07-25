import {describe, expect, it} from 'vitest'
import {romanizeName, romanizeSyllable} from './hangulRomanize'

describe('romanizeSyllable', () => {
    // 국립국어원(2000) 로마자 표기법 — 인명 예외 규정의 공식 예시.
    // "한복남"은 실제 발음(한봉남)과 무관하게 음절별 표기를 그대로 반영해 "Boknam"이 된다.
    it('한복남의 각 음절을 공식 예시와 일치하게 로마자로 바꾼다 (음운 변화 미반영)', () => {
        expect(romanizeSyllable('한')).toBe('han')
        expect(romanizeSyllable('복')).toBe('bok')
        expect(romanizeSyllable('남')).toBe('nam')
    })

    // 두 번째 공식 예시: "홍빛나" — 종성 ㅊ이 대표음 t로 표기되어 "Bitna"가 된다 (Binna 아님).
    it('홍빛나의 각 음절을 공식 예시와 일치하게 로마자로 바꾼다', () => {
        expect(romanizeSyllable('홍')).toBe('hong')
        expect(romanizeSyllable('빛')).toBe('bit')
        expect(romanizeSyllable('나')).toBe('na')
    })

    it('초성 ㄹ은 기본적으로 r로 적는다', () => {
        expect(romanizeSyllable('류')).toBe('ryu')
    })

    it('한글 음절이 아니면 원문 그대로 반환한다', () => {
        expect(romanizeSyllable('A')).toBe('A')
    })
})

describe('romanizeName', () => {
    it('공식 예시 이름(성 한, 이름 복남)을 "Han Boknam"으로 합성한다', () => {
        const result = romanizeName({surname: '한', givenName: '복남'})
        expect(result.surname).toBe('Han')
        expect(result.givenName).toBe('Boknam')
        expect(result.full).toBe('Han Boknam')
    })

    it('공식 예시 이름(성 홍, 이름 빛나)을 "Hong Bitna"로 합성한다', () => {
        const result = romanizeName({surname: '홍', givenName: '빛나'})
        expect(result.full).toBe('Hong Bitna')
    })

    it('hyphen 스타일은 음절 사이에 붙임표를 넣고 뒤 음절은 소문자로 유지한다', () => {
        const result = romanizeName({surname: '홍', givenName: '빛나'}, 'hyphen')
        expect(result.givenName).toBe('Bit-na')
    })

    it('capitalize-each 스타일은 음절마다 대문자로 적는다', () => {
        const result = romanizeName({surname: '홍', givenName: '빛나'}, 'capitalize-each')
        expect(result.givenName).toBe('BitNa')
    })
})
