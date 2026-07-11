import {describe, expect, it} from 'vitest'
import {
    convertKeyboard,
    countChars,
    dateToUnix,
    decodeBase64,
    decodeJwt,
    decodeUrl,
    encodeBase64,
    encodeUrl,
    formatJson,
    generateUuid,
    hexToRgb,
    hslToRgb,
    minifyJson,
    normalizeWhitespace,
    rgbToHex,
    rgbToHsl,
    unixToDate,
} from './frontendTools'

describe('formatJson', () => {
    it('들여쓰기 적용된 JSON 반환', () => {
        expect(formatJson('{"a":1}')).toBe('{\n  "a": 1\n}')
    })
    it('이미 포맷된 JSON도 정규화', () => {
        expect(formatJson('{ "a" :  1 }')).toBe('{\n  "a": 1\n}')
    })
    it('유효하지 않은 JSON은 에러', () => {
        expect(() => formatJson('not json')).toThrow()
    })
})

describe('minifyJson', () => {
    it('공백 제거된 JSON 반환', () => {
        expect(minifyJson('{\n  "a": 1\n}')).toBe('{"a":1}')
    })
    it('유효하지 않은 JSON은 에러', () => {
        expect(() => minifyJson('bad')).toThrow()
    })
})

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

describe('decodeJwt', () => {
    // header: {"alg":"HS256","typ":"JWT"}, payload: {"sub":"1234567890","name":"John Doe","iat":1516239022}
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'

    it('헤더 파싱', () => {
        const {header} = decodeJwt(token)
        expect(header).toEqual({alg: 'HS256', typ: 'JWT'})
    })
    it('페이로드 파싱', () => {
        const {payload} = decodeJwt(token)
        expect((payload as { sub: string }).sub).toBe('1234567890')
    })
    it('잘못된 형식은 에러', () => {
        expect(() => decodeJwt('not.a.jwt')).toThrow()
    })
})

describe('타임스탬프', () => {
    it('Unix → ISO 날짜 문자열 변환', () => {
        // 0 = 1970-01-01T00:00:00.000Z
        expect(unixToDate(0)).toBe('1970-01-01T00:00:00.000Z')
    })
    it('날짜 문자열 → Unix 변환', () => {
        expect(dateToUnix('1970-01-01T00:00:00.000Z')).toBe(0)
    })
})

describe('색상 코드', () => {
    it('HEX → RGB', () => {
        expect(hexToRgb('#ff0000')).toEqual({r: 255, g: 0, b: 0})
    })
    it('HEX 소문자 처리', () => {
        expect(hexToRgb('#ffffff')).toEqual({r: 255, g: 255, b: 255})
    })
    it('잘못된 HEX는 에러', () => {
        expect(() => hexToRgb('gg0000')).toThrow()
    })
    it('RGB → HEX', () => {
        expect(rgbToHex(255, 0, 0)).toBe('#ff0000')
    })
    it('RGB → HSL (빨강)', () => {
        const {h, s, l} = rgbToHsl(255, 0, 0)
        expect(h).toBe(0)
        expect(s).toBe(100)
        expect(l).toBe(50)
    })
    it('HSL → RGB (빨강)', () => {
        expect(hslToRgb(0, 100, 50)).toEqual({r: 255, g: 0, b: 0})
    })
})

describe('generateUuid', () => {
    it('UUID v4 형식 반환', () => {
        const uuid = generateUuid()
        expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    })
    it('매번 다른 값', () => {
        expect(generateUuid()).not.toBe(generateUuid())
    })
})

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
