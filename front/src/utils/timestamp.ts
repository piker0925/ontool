export function unixToDate(unix: number): string {
    return new Date(unix * 1000).toISOString()
}

export function dateToUnix(date: string): number {
    return Math.floor(new Date(date).getTime() / 1000)
}

export type TimestampUnit = 's' | 'ms'

/** 입력 숫자 문자열의 자릿수로 초/밀리초 단위를 감지한다 (12자리 이상 → 밀리초). */
export function detectTimestampUnit(input: string): TimestampUnit {
    const digits = input.trim().replace(/^-/, '')
    if (!/^\d+$/.test(digits)) return 's'
    return digits.length >= 12 ? 'ms' : 's'
}

const OFFSET_FORMATTER_OPTS: Intl.DateTimeFormatOptions = {timeZoneName: 'longOffset'}

/** 해당 시각의 타임존 오프셋 문자열을 반환한다. colon=true → '+09:00', false → '+0900' */
export function getTimezoneOffset(ms: number, timeZone: string, colon = true): string {
    const parts = new Intl.DateTimeFormat('en-US', {...OFFSET_FORMATTER_OPTS, timeZone})
        .formatToParts(new Date(ms))
    const tzName = parts.find(p => p.type === 'timeZoneName')?.value ?? 'GMT'
    // 'GMT+09:00' | 'GMT-05:00' | 'GMT' (UTC)
    const m = tzName.match(/([+-])(\d{2}):(\d{2})/)
    if (!m) return colon ? '+00:00' : '+0000'
    return colon ? `${m[1]}${m[2]}:${m[3]}` : `${m[1]}${m[2]}${m[3]}`
}

function timezoneParts(ms: number, timeZone: string): Record<string, string> {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        weekday: 'short', hour12: false,
    }).formatToParts(new Date(ms))
    const map: Record<string, string> = {}
    for (const p of parts) map[p.type] = p.value
    // hour12:false에서 자정이 '24'로 나오는 브라우저 호환 처리
    if (map.hour === '24') map.hour = '00'
    return map
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * 패턴 토큰(YYYY MM DD HH mm ss SSS MMM ddd Z ZZ)으로 타임존 기준 시각을 포맷한다.
 * Z → '+09:00', ZZ → '+0900'
 */
export function formatUnixPattern(ms: number, pattern: string, timeZone = 'UTC'): string {
    const p = timezoneParts(ms, timeZone)
    const millis = String(((ms % 1000) + 1000) % 1000).padStart(3, '0')
    const monthShort = MONTH_SHORT[Number(p.month) - 1] ?? p.month
    const tokens: Record<string, string> = {
        YYYY: p.year, MM: p.month, DD: p.day,
        HH: p.hour, mm: p.minute, ss: p.second, SSS: millis,
        MMM: monthShort, ddd: p.weekday,
        ZZ: getTimezoneOffset(ms, timeZone, false),
        Z: getTimezoneOffset(ms, timeZone, true),
    }
    return pattern.replace(/YYYY|SSS|MMM|ddd|MM|DD|HH|mm|ss|ZZ|Z/g, t => tokens[t] ?? t)
}

/** 타임존 기준 'YYYY-MM-DD HH:mm:ss' 문자열을 반환한다. */
export function formatInTimezone(ms: number, timeZone: string): string {
    return formatUnixPattern(ms, 'YYYY-MM-DD HH:mm:ss', timeZone)
}

/** 상대 시간을 한국어로 반환한다. 예: '3시간 전', '5분 후', '방금 전' */
export function formatRelativeTime(targetMs: number, nowMs: number = Date.now()): string {
    const diff = nowMs - targetMs
    const abs = Math.abs(diff)
    const suffix = diff >= 0 ? '전' : '후'
    if (abs < 10_000) return diff >= 0 ? '방금 전' : '잠시 후'
    const units: Array<[number, string]> = [
        [365 * 24 * 3600_000, '년'],
        [30 * 24 * 3600_000, '개월'],
        [24 * 3600_000, '일'],
        [3600_000, '시간'],
        [60_000, '분'],
        [1000, '초'],
    ]
    for (const [unitMs, label] of units) {
        if (abs >= unitMs) return `${Math.floor(abs / unitMs)}${label} ${suffix}`
    }
    return diff >= 0 ? '방금 전' : '잠시 후'
}
