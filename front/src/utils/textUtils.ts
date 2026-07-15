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
