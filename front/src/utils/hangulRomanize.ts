// 국립국어원 로마자 표기법(문화관광부 고시 제2000-8호) 기준 한글 이름 로마자 변환.
//
// 인명 예외 규정: 이름에서 일어나는 음운 변화(연음·비음화·구개음화 등)는 표기에 반영하지 않는다.
// 예: "한복남"은 [한봉남]으로 발음되지만 표기는 음절별 그대로 "Han Boknam" — "Han Bongnam"이 아니다.
// 이 파일은 그래서 음절을 서로 이어붙여 발음을 재계산하지 않고, 각 음절을 독립적으로 로마자화한다.
// (예외: ㄹ 받침 뒤 ㄹ 초성이 이어지는 표기상의 "ㄹㄹ→ll" 규칙은 발음 변화가 아니라 로마자 표기법
//  자체에 정의된 표기 규칙이라 그대로 적용한다.)

const SYLLABLE_BASE = 0xAC00
const SYLLABLE_END = 0xD7A3

// 초성 19개, 국립국어원 표기법 표1 순서
const CHOSUNG_ROMAN = [
    'g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's',
    'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h',
]
const RIEUL_CHOSUNG_INDEX = 5

// 중성 21개, 국립국어원 표기법 표2 순서
const JUNGSUNG_ROMAN = [
    'a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa',
    'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i',
]

// 종성(받침) 28개(받침 없음 포함), 국립국어원 표기법 표1 + 붙임 규정.
// 겹받침은 실제 발음되는 대표음 기준.
const JONGSUNG_ROMAN = [
    '', 'k', 'k', 'k', 'n', 'n', 'n', 't', 'l', 'k',
    'm', 'l', 'l', 'l', 'p', 'l', 'm', 'p', 'p', 't', 't',
    'ng', 't', 't', 'k', 't', 'p', 't',
]
const RIEUL_JONGSUNG_INDEX = 8

interface DecomposedSyllable {
    choIndex: number
    jungIndex: number
    jongIndex: number
}

function decompose(syllable: string): DecomposedSyllable | null {
    const code = syllable.charCodeAt(0)
    if (code < SYLLABLE_BASE || code > SYLLABLE_END) return null
    const offset = code - SYLLABLE_BASE
    const choIndex = Math.floor(offset / 28 / 21)
    const jungIndex = Math.floor((offset / 28) % 21)
    const jongIndex = offset % 28
    return {choIndex, jungIndex, jongIndex}
}

/**
 * 한글 음절 하나를 국립국어원 표기법으로 로마자화한다. 초성 ㄹ은 기본적으로 'r'이지만
 * prevJongIndex(직전 음절의 종성 인덱스)가 ㄹ 받침(8)이면 'l'로 적어 "ㄹㄹ" 표기 규칙을 반영한다.
 * 한글 음절이 아니면 원문 그대로 반환한다.
 */
export function romanizeSyllable(syllable: string, prevJongIndex: number | null = null): string {
    const decomposed = decompose(syllable)
    if (!decomposed) return syllable
    const {choIndex, jungIndex, jongIndex} = decomposed

    let cho = CHOSUNG_ROMAN[choIndex]
    if (choIndex === RIEUL_CHOSUNG_INDEX && prevJongIndex === RIEUL_JONGSUNG_INDEX) cho = 'l'

    return cho + JUNGSUNG_ROMAN[jungIndex] + JONGSUNG_ROMAN[jongIndex]
}

/**
 * 한글 단어(성 또는 이름)를 음절별로 로마자화해 이어붙인다. 음절 간 음운 변화는 반영하지 않되,
 * ㄹㄹ 표기 규칙(romanizeSyllable 참고)만 적용한다.
 */
function romanizeWord(word: string): string {
    let result = ''
    let prevJongIndex: number | null = null
    for (const ch of word) {
        const decomposed = decompose(ch)
        result += romanizeSyllable(ch, prevJongIndex)
        prevJongIndex = decomposed ? decomposed.jongIndex : null
    }
    return result
}

function capitalizeFirst(s: string): string {
    if (!s) return s
    return s[0].toUpperCase() + s.slice(1)
}

export type NameStyle = 'concat' | 'hyphen' | 'capitalize-each'

export interface RomanizedName {
    surname: string
    givenName: string
    full: string
}

/**
 * 성/이름을 국립국어원 표기법으로 변환한다.
 * - concat(원칙): 이름 음절을 붙여 쓰고 첫 글자만 대문자 (예: Yongha)
 * - hyphen(허용): 음절 사이에 붙임표, 뒤 음절은 소문자 유지 (예: Yong-ha)
 * - capitalize-each(관용, 비공식): 음절마다 대문자 (예: YongHa) — 여권 실무에서 흔히 쓰이나
 *   국립국어원 공식 표기는 아니다.
 */
export function romanizeName(
    input: { surname: string; givenName: string },
    style: NameStyle = 'concat',
): RomanizedName {
    const surname = capitalizeFirst(romanizeWord(input.surname))

    const syllables = Array.from(input.givenName)
    let prevJongIndex: number | null = null
    const romanizedSyllables = syllables.map(ch => {
        const decomposed = decompose(ch)
        const roman = romanizeSyllable(ch, prevJongIndex)
        prevJongIndex = decomposed ? decomposed.jongIndex : null
        return roman
    })

    let givenName: string
    if (style === 'hyphen') {
        givenName = capitalizeFirst(romanizedSyllables.join('-'))
    } else if (style === 'capitalize-each') {
        givenName = romanizedSyllables.map(capitalizeFirst).join('')
    } else {
        givenName = capitalizeFirst(romanizedSyllables.join(''))
    }

    const full = [surname, givenName].filter(Boolean).join(' ')
    return {surname, givenName, full}
}
