// ── JSON ────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sortedReplacer(_key: string, value: any): any {
    if (value && typeof value === 'object' && !Array.isArray(value))
        return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)))
    return value
}

export function formatJson(input: string, indent: number | string = 2, sortKeys = false): string {
    return JSON.stringify(JSON.parse(input), sortKeys ? sortedReplacer : undefined, indent)
}

export function minifyJson(input: string, sortKeys = false): string {
    return JSON.stringify(JSON.parse(input), sortKeys ? sortedReplacer : undefined)
}

// ── Base64 ───────────────────────────────────────────────────────────────────

export function encodeBase64(input: string): string {
    const bytes = new TextEncoder().encode(input)
    return btoa(Array.from(bytes, b => String.fromCharCode(b)).join(''))
}

export function decodeBase64(input: string): string {
    const bytes = Uint8Array.from(atob(input), c => c.charCodeAt(0))
    return new TextDecoder().decode(bytes)
}

export function encodeBase64Url(input: string): string {
    return encodeBase64(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export function decodeBase64Url(input: string): string {
    const padded = input.replace(/-/g, '+').replace(/_/g, '/')
    const pad = (4 - padded.length % 4) % 4
    return decodeBase64(padded + '='.repeat(pad))
}

// ── URL 인코딩 ───────────────────────────────────────────────────────────────

export function encodeUrl(input: string): string {
    return encodeURIComponent(input)
}

export function decodeUrl(input: string): string {
    return decodeURIComponent(input)
}

export function parseQueryString(input: string): Array<{ key: string; value: string; raw: string }> {
    const str = input.trim()
    let qs = str
    try {
        const url = new URL(str)
        qs = url.search.startsWith('?') ? url.search.slice(1) : url.search
    } catch {
        qs = str.startsWith('?') ? str.slice(1) : str
    }
    if (!qs) return []
    return qs.split('&').filter(Boolean).map(pair => {
        const eqIdx = pair.indexOf('=')
        const rawKey = eqIdx >= 0 ? pair.slice(0, eqIdx) : pair
        const rawVal = eqIdx >= 0 ? pair.slice(eqIdx + 1) : ''
        return {
            key: decodeURIComponent(rawKey.replace(/\+/g, ' ')),
            value: decodeURIComponent(rawVal.replace(/\+/g, ' ')),
            raw: rawVal,
        }
    })
}

// ── JWT ─────────────────────────────────────────────────────────────────────

export function decodeJwt(token: string): { header: unknown; payload: unknown } {
    const parts = token.split('.')
    if (parts.length !== 3) throw new Error('JWT 형식이 올바르지 않습니다.')
    const decode = (part: string) => {
        const padded = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(
            part.length + (4 - (part.length % 4)) % 4, '='
        )
        return JSON.parse(decodeBase64(padded))
    }
    return {header: decode(parts[0]), payload: decode(parts[1])}
}

// ── 타임스탬프 ───────────────────────────────────────────────────────────────

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

// ── 색상 코드 ────────────────────────────────────────────────────────────────

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const clean = hex.replace('#', '')
    if (!/^[0-9a-fA-F]{6}$/.test(clean)) throw new Error('올바른 HEX 색상이 아닙니다.')
    const n = parseInt(clean, 16)
    return {r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff}
}

export function rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
}

export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    const rn = r / 255, gn = g / 255, bn = b / 255
    const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
    const l = (max + min) / 2
    if (max === min) return {h: 0, s: 0, l: Math.round(l * 100)}
    const d = max - min
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    let h = 0
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6
    else if (max === gn) h = ((bn - rn) / d + 2) / 6
    else h = ((rn - gn) / d + 4) / 6
    return {h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100)}
}

export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    const sn = s / 100, ln = l / 100
    const c = (1 - Math.abs(2 * ln - 1)) * sn
    const x = c * (1 - Math.abs((h / 60) % 2 - 1))
    const m = ln - c / 2
    let rn = 0, gn = 0, bn = 0
    if (h < 60) {
        rn = c;
        gn = x
    } else if (h < 120) {
        rn = x;
        gn = c
    } else if (h < 180) {
        gn = c;
        bn = x
    } else if (h < 240) {
        gn = x;
        bn = c
    } else if (h < 300) {
        rn = x;
        bn = c
    } else {
        rn = c;
        bn = x
    }
    return {
        r: Math.round((rn + m) * 255),
        g: Math.round((gn + m) * 255),
        b: Math.round((bn + m) * 255),
    }
}

export interface Rgba {
    r: number;
    g: number;
    b: number;
    a: number
}

/**
 * 색상 문자열 파싱: #RGB/#RGBA/#RRGGBB/#RRGGBBAA, rgb()/rgba(), hsl()/hsla() 지원.
 * a는 0~1 범위.
 */
export function parseColor(input: string): Rgba {
    const str = input.trim()

    const hexMatch = str.match(/^#?([0-9a-fA-F]{3,8})$/)
    if (hexMatch) {
        let hex = hexMatch[1]
        if (hex.length === 3 || hex.length === 4) {
            hex = hex.split('').map(c => c + c).join('')
        }
        if (hex.length === 6) hex += 'ff'
        if (hex.length !== 8) throw new Error('올바른 HEX 색상이 아닙니다.')
        return {
            r: parseInt(hex.slice(0, 2), 16),
            g: parseInt(hex.slice(2, 4), 16),
            b: parseInt(hex.slice(4, 6), 16),
            a: Math.round(parseInt(hex.slice(6, 8), 16) / 255 * 1000) / 1000,
        }
    }

    const rgbMatch = str.match(/^rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*(?:[,/]\s*([\d.]+%?)\s*)?\)$/i)
    if (rgbMatch) {
        const [r, g, b] = [rgbMatch[1], rgbMatch[2], rgbMatch[3]].map(Number)
        if ([r, g, b].some(v => v > 255)) throw new Error('RGB 값은 0~255 범위여야 합니다.')
        return {r, g, b, a: parseAlpha(rgbMatch[4])}
    }

    const hslMatch = str.match(/^hsla?\(\s*(\d{1,3}(?:\.\d+)?)\s*[, ]\s*([\d.]+)%\s*[, ]\s*([\d.]+)%\s*(?:[,/]\s*([\d.]+%?)\s*)?\)$/i)
    if (hslMatch) {
        const h = Number(hslMatch[1]), s = Number(hslMatch[2]), l = Number(hslMatch[3])
        if (h > 360 || s > 100 || l > 100) throw new Error('HSL 값 범위가 올바르지 않습니다.')
        const {r, g, b} = hslToRgb(h % 360, s, l)
        return {r, g, b, a: parseAlpha(hslMatch[4])}
    }

    throw new Error('지원하지 않는 색상 형식입니다. 예: #ff0000, #ff000080, rgb(255, 0, 0), hsl(0, 100%, 50%)')
}

function parseAlpha(raw: string | undefined): number {
    if (raw === undefined) return 1
    const value = raw.endsWith('%') ? Number(raw.slice(0, -1)) / 100 : Number(raw)
    if (isNaN(value) || value < 0 || value > 1) throw new Error('알파 값은 0~1 범위여야 합니다.')
    return Math.round(value * 1000) / 1000
}

/** RGBA → HEX. a<1이면 8자리(#RRGGBBAA), 아니면 6자리(#RRGGBB). */
export function rgbaToHex(r: number, g: number, b: number, a = 1): string {
    const base = rgbToHex(r, g, b)
    if (a >= 1) return base
    return base + Math.round(a * 255).toString(16).padStart(2, '0')
}

export function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
    const rn = r / 255, gn = g / 255, bn = b / 255
    const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
    const d = max - min
    let h = 0
    if (d !== 0) {
        if (max === rn) h = (((gn - bn) / d) % 6 + 6) % 6 / 6
        else if (max === gn) h = ((bn - rn) / d + 2) / 6
        else h = ((rn - gn) / d + 4) / 6
    }
    const s = max === 0 ? 0 : d / max
    return {h: Math.round(h * 360), s: Math.round(s * 100), v: Math.round(max * 100)}
}

/** WCAG 상대 휘도 (0~1). */
export function relativeLuminance(r: number, g: number, b: number): number {
    const lin = (v: number) => {
        const c = v / 255
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    }
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

/** WCAG 대비율 (1~21, 소수 둘째 자리 반올림). */
export function contrastRatio(c1: { r: number; g: number; b: number }, c2: { r: number; g: number; b: number }): number {
    const l1 = relativeLuminance(c1.r, c1.g, c1.b)
    const l2 = relativeLuminance(c2.r, c2.g, c2.b)
    const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1]
    return Math.round((hi + 0.05) / (lo + 0.05) * 100) / 100
}

/** 알파를 배경색 위에 합성한 불투명 색상을 반환한다. */
export function compositeOnBackground(fg: Rgba, bg: { r: number; g: number; b: number }): { r: number; g: number; b: number } {
    const blend = (f: number, back: number) => Math.round(f * fg.a + back * (1 - fg.a))
    return {r: blend(fg.r, bg.r), g: blend(fg.g, bg.g), b: blend(fg.b, bg.b)}
}

export interface WcagLevels {
    aa: boolean;        // 일반 텍스트 AA (>= 4.5)
    aaa: boolean;       // 일반 텍스트 AAA (>= 7)
    aaLarge: boolean;   // 큰 텍스트 AA (>= 3)
}

export function wcagLevels(ratio: number): WcagLevels {
    return {aa: ratio >= 4.5, aaa: ratio >= 7, aaLarge: ratio >= 3}
}

// ── UUID ─────────────────────────────────────────────────────────────────────

export function generateUuid(): string {
    return crypto.randomUUID()
}

/**
 * UUID v7 (RFC 9562): 상위 48비트 = Unix 밀리초 타임스탬프, 나머지는 랜덤.
 * 시간순 정렬 가능한 UUID.
 */
export function generateUuidV7(timestampMs: number = Date.now()): string {
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)
    const ts = BigInt(timestampMs)
    for (let i = 0; i < 6; i++) {
        bytes[i] = Number((ts >> BigInt((5 - i) * 8)) & 0xffn)
    }
    bytes[6] = (bytes[6] & 0x0f) | 0x70  // version 7
    bytes[8] = (bytes[8] & 0x3f) | 0x80  // variant 10xx
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export type UuidExportFormat = 'lines' | 'json' | 'csv' | 'sql'

/** UUID 목록을 내보내기 형식 문자열로 변환한다. */
export function formatUuidExport(uuids: string[], format: UuidExportFormat): string {
    switch (format) {
        case 'lines':
            return uuids.join('\n')
        case 'json':
            return JSON.stringify(uuids)
        case 'csv':
            return ['uuid', ...uuids].join('\n')
        case 'sql':
            return `IN (${uuids.map(u => `'${u}'`).join(', ')})`
    }
}

// ── 글자 수 카운터 ────────────────────────────────────────────────────────────

export function countChars(text: string): { chars: number; words: number; bytes: number } {
    const chars = text.length
    const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length
    const bytes = new TextEncoder().encode(text).length
    return {chars, words, bytes}
}

// ── 한영 변환 (두벌식) ────────────────────────────────────────────────────────

const CHOSUNG = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']
const JUNGSUNG = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ']
const JONGSUNG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']

const EN_TO_JAMO: Record<string, string> = {
    r: 'ㄱ', R: 'ㄲ', s: 'ㄴ', e: 'ㄷ', E: 'ㄸ', f: 'ㄹ', a: 'ㅁ', q: 'ㅂ', Q: 'ㅃ',
    t: 'ㅅ', T: 'ㅆ', d: 'ㅇ', w: 'ㅈ', W: 'ㅉ', c: 'ㅊ', z: 'ㅋ', x: 'ㅌ', v: 'ㅍ', g: 'ㅎ',
    k: 'ㅏ', o: 'ㅐ', i: 'ㅑ', O: 'ㅒ', j: 'ㅓ', p: 'ㅔ', u: 'ㅕ', P: 'ㅖ',
    h: 'ㅗ', y: 'ㅛ', n: 'ㅜ', b: 'ㅠ', m: 'ㅡ', l: 'ㅣ',
}

const JAMO_TO_EN: Record<string, string> = Object.fromEntries(
    Object.entries(EN_TO_JAMO).map(([k, v]) => [v, k])
)

// 두벌식: 두 개의 낱자를 연속 입력해 만드는 복합 모음·복합 받침
const JUNG_COMBOS: Record<string, string> = {
    'ㅗㅏ': 'ㅘ', 'ㅗㅐ': 'ㅙ', 'ㅗㅣ': 'ㅚ',
    'ㅜㅓ': 'ㅝ', 'ㅜㅔ': 'ㅞ', 'ㅜㅣ': 'ㅟ',
    'ㅡㅣ': 'ㅢ',
}
const JONG_COMBOS: Record<string, string> = {
    'ㄱㅅ': 'ㄳ', 'ㄴㅈ': 'ㄵ', 'ㄴㅎ': 'ㄶ',
    'ㄹㄱ': 'ㄺ', 'ㄹㅁ': 'ㄻ', 'ㄹㅂ': 'ㄼ', 'ㄹㅅ': 'ㄽ', 'ㄹㅌ': 'ㄾ', 'ㄹㅍ': 'ㄿ', 'ㄹㅎ': 'ㅀ',
    'ㅂㅅ': 'ㅄ',
}
const JUNG_SPLIT: Record<string, [string, string]> = Object.fromEntries(
    Object.entries(JUNG_COMBOS).map(([pair, combo]) => [combo, [pair[0], pair[1]]]),
)
const JONG_SPLIT: Record<string, [string, string]> = Object.fromEntries(
    Object.entries(JONG_COMBOS).map(([pair, combo]) => [combo, [pair[0], pair[1]]]),
)

function jamoToEn(jamo: string): string {
    const direct = JAMO_TO_EN[jamo]
    if (direct !== undefined) return direct
    const split = JUNG_SPLIT[jamo] ?? JONG_SPLIT[jamo]
    if (!split) return ''
    return (JAMO_TO_EN[split[0]] ?? '') + (JAMO_TO_EN[split[1]] ?? '')
}

const SYLLABLE_BASE = 0xAC00

function isVowelJamo(j: string): boolean {
    return JUNGSUNG.includes(j)
}

function buildSyllable(cho: string, jung: string, jong = ''): string {
    const ci = CHOSUNG.indexOf(cho)
    const vi = JUNGSUNG.indexOf(jung)
    const ji = JONGSUNG.indexOf(jong)
    if (ci < 0 || vi < 0 || ji < 0) return cho + jung + jong
    return String.fromCharCode(SYLLABLE_BASE + (ci * 21 + vi) * 28 + ji)
}

export function convertKeyboard(text: string, direction: 'ko-en' | 'en-ko'): string {
    if (direction === 'ko-en') {
        return Array.from(text).map(ch => {
            const code = ch.charCodeAt(0)
            if (code < SYLLABLE_BASE || code > 0xD7A3) return ch
            const offset = code - SYLLABLE_BASE
            const ci = Math.floor(offset / 28 / 21)
            const vi = Math.floor((offset / 28) % 21)
            const ji = offset % 28
            return jamoToEn(CHOSUNG[ci]) +
                jamoToEn(JUNGSUNG[vi]) +
                (ji > 0 ? jamoToEn(JONGSUNG[ji]) : '')
        }).join('')
    }

    // en-ko: state machine with jongsung support
    const jamos = Array.from(text).map(c => EN_TO_JAMO[c] ?? c)
    const result: string[] = []
    let cho = ''
    let jung = ''
    let jong = ''

    for (const jamo of jamos) {
        const isV = isVowelJamo(jamo)

        if (!cho && !jung) {
            // EMPTY
            if (isV) result.push(jamo)
            else cho = jamo
        } else if (cho && !jung) {
            // CHO
            if (isV) {
                jung = jamo
            } else {
                result.push(cho);
                cho = jamo
            }
        } else if (cho && jung && !jong) {
            // CHO_JUNG
            if (isV) {
                const combined = JUNG_COMBOS[jung + jamo]
                if (combined) {
                    jung = combined
                } else {
                    result.push(buildSyllable(cho, jung))
                    cho = '';
                    jung = ''
                    result.push(jamo)
                }
            } else if (JONGSUNG.includes(jamo)) {
                jong = jamo  // tentative jongsung — confirmed only if next char is not a vowel
            } else {
                result.push(buildSyllable(cho, jung))
                cho = jamo;
                jung = ''
            }
        } else {
            // CHO_JUNG_JONG
            if (isV) {
                // jongsung was tentative and migrates to become the next syllable's chosung.
                // A compound jongsung splits: its first jamo stays as this syllable's jongsung,
                // only the last jamo migrates (e.g. "닭" + 이 → 달기, not 다ㄺ+이).
                const split = JONG_SPLIT[jong]
                if (split) {
                    result.push(buildSyllable(cho, jung, split[0]))
                    cho = split[1]
                } else {
                    result.push(buildSyllable(cho, jung))
                    cho = jong
                }
                jung = jamo;
                jong = ''
            } else {
                const combined = JONG_COMBOS[jong + jamo]
                if (combined) {
                    jong = combined
                } else {
                    result.push(buildSyllable(cho, jung, jong))
                    cho = jamo;
                    jung = '';
                    jong = ''
                }
            }
        }
    }

    if (cho && jung) result.push(buildSyllable(cho, jung, jong))
    else if (cho) result.push(cho)
    else if (jung) result.push(jung)

    return result.join('')
}

// ── 공백 정규화 ───────────────────────────────────────────────────────────────

export function normalizeWhitespace(text: string): string {
    return text
        .replace(/[ \t]+/g, ' ')       // 연속 공백·탭 → 단일 공백
        .replace(/\n{2,}/g, '\n')      // 연속 줄바꿈 → 단일 줄바꿈
        .trim()
}
