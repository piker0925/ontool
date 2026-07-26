import {describe, expect, it} from 'vitest'
import {convertKeyboard, countChars, countCharsDetailed, detectKeyboardDirection, normalizeWhitespace} from './textUtils'

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
    it('영어 → 한글 대문자(Shift 전용 매핑 없는 키)도 소문자와 같은 자모로 변환', () => {
        // A/S/D(대문자, 전용 쌍자음 없음)는 소문자 a/s/d와 같은 자모로 취급돼야 함 — 실제 두벌식
        // 자판은 R/E/Q/T/W/O/P 7개 키만 Shift로 별도 글자(쌍자음·이중모음)를 낸다
        expect(convertKeyboard('AK', 'en-ko')).toBe('마')
        expect(convertKeyboard('AK', 'en-ko')).toBe(convertKeyboard('ak', 'en-ko'))
        expect(convertKeyboard('SK', 'en-ko')).toBe('나')
        expect(convertKeyboard('SK', 'en-ko')).toBe(convertKeyboard('sk', 'en-ko'))
        expect(convertKeyboard('DK', 'en-ko')).toBe('아')
        expect(convertKeyboard('DK', 'en-ko')).toBe(convertKeyboard('dk', 'en-ko'))
    })
    it('영어 → 한글 대문자 중 Shift 전용 매핑이 있는 키(쌍자음)는 그대로 사용', () => {
        expect(convertKeyboard('Rk', 'en-ko')).toBe('까')
    })
    it('한글 → 영어 낱자(자음 단독) 인식 — 최소 3개', () => {
        expect(convertKeyboard('ㄱ', 'ko-en')).toBe('r')
        expect(convertKeyboard('ㄴ', 'ko-en')).toBe('s')
        expect(convertKeyboard('ㅁ', 'ko-en')).toBe('a')
    })
    it('한글 → 영어 낱자(모음 단독) 인식 — 최소 2개', () => {
        expect(convertKeyboard('ㅣ', 'ko-en')).toBe('l')
        expect(convertKeyboard('ㅏ', 'ko-en')).toBe('k')
    })
    it('한글 → 영어 낱자(복합 받침 하나)도 분해해서 인식', () => {
        expect(convertKeyboard('ㄳ', 'ko-en')).toBe('rt')
    })
})

describe('countCharsDetailed', () => {
    it('공백 포함/제외 글자 수, 단어 수 — 알기 쉬운 ASCII 케이스로 검증', () => {
        // "a b c" → 공백 포함 5자(a, ,b, ,c), 스페이스 2개 제외하면 3자, 단어 3개
        const result = countCharsDetailed('a b c')
        expect(result.charsWithSpace).toBe(5)
        expect(result.charsWithoutSpace).toBe(3)
        expect(result.words).toBe(3)
        expect(result.lines).toBe(1)
    })

    it('한글 텍스트에서 공백 제외 글자 수를 정확히 센다', () => {
        // "안녕 하세요" → 공백 포함 6자, 공백 1개 제외하면 5자
        const result = countCharsDetailed('안녕 하세요')
        expect(result.charsWithSpace).toBe(6)
        expect(result.charsWithoutSpace).toBe(5)
        expect(result.words).toBe(2)
    })

    it('바이트 수는 UTF-8 인코딩 기준 (한글 3바이트, ASCII 1바이트)', () => {
        const result = countCharsDetailed('안a')
        expect(result.bytes).toBe(4) // 안(3) + a(1)
    })

    it('빈 문자열은 모든 값이 0 (줄 수도 0)', () => {
        const result = countCharsDetailed('')
        expect(result.charsWithSpace).toBe(0)
        expect(result.charsWithoutSpace).toBe(0)
        expect(result.bytes).toBe(0)
        expect(result.words).toBe(0)
        expect(result.lines).toBe(0)
    })

    it('줄 수는 줄바꿈 개수 + 1', () => {
        expect(countCharsDetailed('a\nb\nc').lines).toBe(3)
        expect(countCharsDetailed('한 줄').lines).toBe(1)
    })
})

describe('detectKeyboardDirection', () => {
    it('라틴 문자가 다수면 en-ko(오타를 한글로 되돌림)로 판단', () => {
        expect(detectKeyboardDirection('dkssud')).toBe('en-ko')
    })
    it('한글이 다수면 ko-en(오타를 영문으로 되돌림)로 판단', () => {
        expect(detectKeyboardDirection('안녕')).toBe('ko-en')
    })
    it('신호가 없으면(빈 문자열) 기본값 en-ko', () => {
        expect(detectKeyboardDirection('')).toBe('en-ko')
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
