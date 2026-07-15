import {describe, expect, it} from 'vitest'
import {
    dateToUnix,
    detectTimestampUnit,
    formatInTimezone,
    formatRelativeTime,
    formatUnixPattern,
    getTimezoneOffset,
    unixToDate,
} from './timestamp'

describe('타임스탬프', () => {
    it('Unix → ISO 날짜 문자열 변환', () => {
        // 0 = 1970-01-01T00:00:00.000Z
        expect(unixToDate(0)).toBe('1970-01-01T00:00:00.000Z')
    })
    it('날짜 문자열 → Unix 변환', () => {
        expect(dateToUnix('1970-01-01T00:00:00.000Z')).toBe(0)
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
