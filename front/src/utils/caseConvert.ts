// 문자열 케이스 변환 — 브라우저 로컬. 순수 문자열 조작이라 서버 왕복 불필요.

export type CaseFormat = 'camel' | 'pascal' | 'snake' | 'kebab' | 'constant' | 'dot' | 'title'

export const CASE_FORMATS: CaseFormat[] = ['camel', 'pascal', 'snake', 'kebab', 'constant', 'dot', 'title']

function capitalize(word: string): string {
    return word ? word.charAt(0).toUpperCase() + word.slice(1) : word
}

function lowerWords(parts: string[]): string[] {
    return parts.filter(s => s.length > 0).map(s => s.toLowerCase())
}

/** camelCase/PascalCase를 대문자 경계에서 분해한다. */
function splitCamel(text: string): string[] {
    const words: string[] = []
    let current = ''
    for (const c of text) {
        if (c >= 'A' && c <= 'Z' && current.length > 0) {
            words.push(current.toLowerCase())
            current = ''
        }
        current += c
    }
    if (current.length > 0) words.push(current.toLowerCase())
    return words
}

/** from 형식 기준으로 소문자 단어 리스트로 분해한다. */
function splitWords(text: string, from: CaseFormat): string[] {
    if (text.length === 0) return []
    switch (from) {
        case 'camel':
        case 'pascal':
            return splitCamel(text)
        case 'snake':
        case 'constant':
            return lowerWords(text.split(/_+/))
        case 'kebab':
            return lowerWords(text.split(/-+/))
        case 'dot':
            return lowerWords(text.split(/\.+/))
        case 'title':
            return lowerWords(text.split(/\s+/))
    }
}

function joinWords(words: string[], to: CaseFormat): string {
    switch (to) {
        case 'camel':
            return words.map((w, i) => (i === 0 ? w : capitalize(w))).join('')
        case 'pascal':
            return words.map(capitalize).join('')
        case 'snake':
            return words.join('_')
        case 'kebab':
            return words.join('-')
        case 'constant':
            return words.map(w => w.toUpperCase()).join('_')
        case 'dot':
            return words.join('.')
        case 'title':
            return words.map(capitalize).join(' ')
    }
}

export function convertCase(text: string, from: CaseFormat, to: CaseFormat): string {
    return joinWords(splitWords(text, from), to)
}
