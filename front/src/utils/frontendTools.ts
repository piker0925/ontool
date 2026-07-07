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

// ── UUID ─────────────────────────────────────────────────────────────────────

export function generateUuid(): string {
    return crypto.randomUUID()
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
            return (JAMO_TO_EN[CHOSUNG[ci]] ?? '') +
                (JAMO_TO_EN[JUNGSUNG[vi]] ?? '') +
                (ji > 0 ? (JAMO_TO_EN[JONGSUNG[ji]] ?? '') : '')
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
                result.push(buildSyllable(cho, jung))
                cho = '';
                jung = ''
                result.push(jamo)
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
                // jongsung was actually the cho of the next syllable
                const prevJong = jong
                result.push(buildSyllable(cho, jung))
                cho = prevJong;
                jung = jamo;
                jong = ''
            } else {
                result.push(buildSyllable(cho, jung, jong))
                cho = jamo;
                jung = '';
                jong = ''
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
