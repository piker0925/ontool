import {describe, expect, it} from 'vitest'
import {
    compositeOnBackground,
    contrastRatio,
    convertKeyboard,
    countChars,
    dateToUnix,
    decodeBase64,
    decodeJwt,
    decodeUrl,
    detectTimestampUnit,
    encodeBase64,
    encodeUrl,
    formatInTimezone,
    formatJson,
    formatRelativeTime,
    formatUnixPattern,
    formatUuidExport,
    generateUuid,
    generateUuidV7,
    getTimezoneOffset,
    hexToRgb,
    hslToRgb,
    minifyJson,
    normalizeWhitespace,
    parseColor,
    rgbaToHex,
    rgbToHex,
    rgbToHsl,
    rgbToHsv,
    unixToDate,
    wcagLevels,
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

describe('generateUuidV7', () => {
    it('버전 니블이 7, variant가 10xx', () => {
        const uuid = generateUuidV7()
        expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    })
    it('앞 48비트가 주어진 타임스탬프(밀리초)와 정확히 일치', () => {
        // 0x018f4df73e00 = 1715000000000
        const uuid = generateUuidV7(1715000000000)
        const first12Hex = uuid.replace(/-/g, '').slice(0, 12)
        expect(parseInt(first12Hex, 16)).toBe(1715000000000)
        expect(first12Hex).toBe('018f4df73e00')
    })
    it('타임스탬프 순서대로 문자열 정렬 가능', () => {
        const earlier = generateUuidV7(1700000000000)
        const later = generateUuidV7(1700000000001)
        expect(earlier < later).toBe(true)
        // 랜덤 부분이 달라도 같은 밀리초 이후 값이 항상 뒤에 온다
        const muchLater = generateUuidV7(1800000000000)
        expect(later < muchLater).toBe(true)
    })
    it('같은 타임스탬프여도 랜덤 부분은 매번 다름', () => {
        expect(generateUuidV7(1700000000000)).not.toBe(generateUuidV7(1700000000000))
    })
})

describe('formatUuidExport', () => {
    const uuids = ['aaa-111', 'bbb-222']
    it('줄바꿈 형식', () => {
        expect(formatUuidExport(uuids, 'lines')).toBe('aaa-111\nbbb-222')
    })
    it('JSON 배열 형식', () => {
        expect(formatUuidExport(uuids, 'json')).toBe('["aaa-111","bbb-222"]')
        expect(JSON.parse(formatUuidExport(uuids, 'json'))).toEqual(uuids)
    })
    it('CSV 형식 (헤더 포함)', () => {
        expect(formatUuidExport(uuids, 'csv')).toBe('uuid\naaa-111\nbbb-222')
    })
    it('SQL IN절 형식', () => {
        expect(formatUuidExport(uuids, 'sql')).toBe("IN ('aaa-111', 'bbb-222')")
    })
    it('단일 항목 SQL IN절', () => {
        expect(formatUuidExport(['x'], 'sql')).toBe("IN ('x')")
    })
})

describe('detectTimestampUnit', () => {
    it('10자리 → 초', () => {
        expect(detectTimestampUnit('1700000000')).toBe('s')
    })
    it('13자리 → 밀리초', () => {
        expect(detectTimestampUnit('1700000000000')).toBe('ms')
    })
    it('짧은 값(0) → 초', () => {
        expect(detectTimestampUnit('0')).toBe('s')
    })
    it('음수 10자리 → 초', () => {
        expect(detectTimestampUnit('-1700000000')).toBe('s')
    })
})

describe('formatInTimezone / getTimezoneOffset', () => {
    const ms = 1700000000000 // 2023-11-14T22:13:20Z
    it('UTC 기준 포맷', () => {
        expect(formatInTimezone(ms, 'UTC')).toBe('2023-11-14 22:13:20')
    })
    it('Asia/Seoul 기준 포맷 (+9시간)', () => {
        expect(formatInTimezone(ms, 'Asia/Seoul')).toBe('2023-11-15 07:13:20')
    })
    it('America/New_York 기준 포맷 (11월 = EST, -5시간)', () => {
        expect(formatInTimezone(ms, 'America/New_York')).toBe('2023-11-14 17:13:20')
    })
    it('오프셋 문자열', () => {
        expect(getTimezoneOffset(ms, 'Asia/Seoul')).toBe('+09:00')
        expect(getTimezoneOffset(ms, 'Asia/Seoul', false)).toBe('+0900')
        expect(getTimezoneOffset(ms, 'UTC')).toBe('+00:00')
        expect(getTimezoneOffset(ms, 'America/New_York')).toBe('-05:00')
    })
})

describe('formatUnixPattern', () => {
    const ms = 1700000000123
    it('ISO 형태 커스텀 패턴 (서울)', () => {
        expect(formatUnixPattern(ms, 'YYYY-MM-DDTHH:mm:ssZ', 'Asia/Seoul')).toBe('2023-11-15T07:13:20+09:00')
    })
    it('RFC 2822 패턴 (UTC)', () => {
        expect(formatUnixPattern(ms, 'ddd, DD MMM YYYY HH:mm:ss ZZ', 'UTC')).toBe('Tue, 14 Nov 2023 22:13:20 +0000')
    })
    it('밀리초 토큰 SSS', () => {
        expect(formatUnixPattern(ms, 'ss.SSS', 'UTC')).toBe('20.123')
    })
    it('MM/DD/YYYY 패턴', () => {
        expect(formatUnixPattern(ms, 'MM/DD/YYYY', 'UTC')).toBe('11/14/2023')
    })
})

describe('formatRelativeTime', () => {
    const now = 1700000000000
    it('3시간 전', () => {
        expect(formatRelativeTime(now - 3 * 3600_000, now)).toBe('3시간 전')
    })
    it('5분 전', () => {
        expect(formatRelativeTime(now - 5 * 60_000, now)).toBe('5분 전')
    })
    it('2일 후 (미래)', () => {
        expect(formatRelativeTime(now + 2 * 24 * 3600_000, now)).toBe('2일 후')
    })
    it('10초 미만은 방금 전', () => {
        expect(formatRelativeTime(now - 3000, now)).toBe('방금 전')
    })
    it('1년 이상', () => {
        expect(formatRelativeTime(now - 400 * 24 * 3600_000, now)).toBe('1년 전')
    })
})

describe('parseColor', () => {
    it('#RRGGBB → 알파 1', () => {
        expect(parseColor('#ff0000')).toEqual({r: 255, g: 0, b: 0, a: 1})
    })
    it('#RRGGBBAA → 알파 파싱 (0x80 = 0.502)', () => {
        expect(parseColor('#ff000080')).toEqual({r: 255, g: 0, b: 0, a: 0.502})
    })
    it('3자리 축약 HEX', () => {
        expect(parseColor('#f00')).toEqual({r: 255, g: 0, b: 0, a: 1})
    })
    it('rgb() 문자열', () => {
        expect(parseColor('rgb(99, 102, 241)')).toEqual({r: 99, g: 102, b: 241, a: 1})
    })
    it('rgba() 문자열', () => {
        expect(parseColor('rgba(255, 0, 0, 0.5)')).toEqual({r: 255, g: 0, b: 0, a: 0.5})
    })
    it('hsl() 문자열 → RGB 변환', () => {
        expect(parseColor('hsl(0, 100%, 50%)')).toEqual({r: 255, g: 0, b: 0, a: 1})
        expect(parseColor('hsl(240, 100%, 50%)')).toEqual({r: 0, g: 0, b: 255, a: 1})
    })
    it('hsla() 문자열', () => {
        expect(parseColor('hsla(0, 100%, 50%, 0.25)')).toEqual({r: 255, g: 0, b: 0, a: 0.25})
    })
    it('잘못된 형식은 에러', () => {
        expect(() => parseColor('notacolor')).toThrow()
        expect(() => parseColor('rgb(999, 0, 0)')).toThrow()
        expect(() => parseColor('#12345')).toThrow()
    })
})

describe('rgbaToHex', () => {
    it('알파 1이면 6자리', () => {
        expect(rgbaToHex(255, 0, 0, 1)).toBe('#ff0000')
    })
    it('알파 0.5면 8자리', () => {
        expect(rgbaToHex(255, 0, 0, 0.5)).toBe('#ff000080')
    })
})

describe('rgbToHsv', () => {
    it('빨강 → hsv(0, 100%, 100%)', () => {
        expect(rgbToHsv(255, 0, 0)).toEqual({h: 0, s: 100, v: 100})
    })
    it('파랑 → hsv(240, 100%, 100%)', () => {
        expect(rgbToHsv(0, 0, 255)).toEqual({h: 240, s: 100, v: 100})
    })
    it('회색 → 채도 0', () => {
        expect(rgbToHsv(128, 128, 128)).toEqual({h: 0, s: 0, v: 50})
    })
    it('HSL과 값이 다른 케이스 (HSV v=100, HSL l=50)', () => {
        // 순색에서 HSV value는 100, HSL lightness는 50 — 두 모델이 실제로 구분되는지 확인
        const hsv = rgbToHsv(255, 0, 0)
        const hsl = rgbToHsl(255, 0, 0)
        expect(hsv.v).toBe(100)
        expect(hsl.l).toBe(50)
    })
})

describe('WCAG 대비', () => {
    it('흰색 vs 검정 = 21:1', () => {
        expect(contrastRatio({r: 255, g: 255, b: 255}, {r: 0, g: 0, b: 0})).toBe(21)
    })
    it('같은 색 = 1:1', () => {
        expect(contrastRatio({r: 128, g: 128, b: 128}, {r: 128, g: 128, b: 128})).toBe(1)
    })
    it('빨강 vs 흰색 ≈ 4:1 (독립 기준값)', () => {
        expect(contrastRatio({r: 255, g: 0, b: 0}, {r: 255, g: 255, b: 255})).toBeCloseTo(4, 1)
    })
    it('레벨 판정: 21 → AA/AAA/AA-Large 모두 통과', () => {
        expect(wcagLevels(21)).toEqual({aa: true, aaa: true, aaLarge: true})
    })
    it('레벨 판정: 4.5 → AA 통과, AAA 실패', () => {
        expect(wcagLevels(4.5)).toEqual({aa: true, aaa: false, aaLarge: true})
    })
    it('레벨 판정: 2 → 전부 실패', () => {
        expect(wcagLevels(2)).toEqual({aa: false, aaa: false, aaLarge: false})
    })
    it('알파 합성: 50% 검정을 흰 배경에 → 회색(128 근처)', () => {
        const result = compositeOnBackground({r: 0, g: 0, b: 0, a: 0.5}, {r: 255, g: 255, b: 255})
        expect(result).toEqual({r: 128, g: 128, b: 128})
    })
    it('알파 합성: 완전 불투명이면 배경 무시', () => {
        const result = compositeOnBackground({r: 10, g: 20, b: 30, a: 1}, {r: 255, g: 255, b: 255})
        expect(result).toEqual({r: 10, g: 20, b: 30})
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
