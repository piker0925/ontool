import type {ModuleKeyword} from '../types'

/** 별칭 목록에서 검색용 문자열만 추출한다 (문자열/객체 혼용 호환). */
export function keywordStrings(keywords?: ModuleKeyword[]): string[] {
    return (keywords ?? []).map(k => (typeof k === 'string' ? k : k.keyword))
}

/**
 * 검색어가 딥링크 별칭과 일치하면 해당 query 문자열을 반환한다.
 * 일치 기준: 별칭이 검색어를 포함하거나 검색어가 별칭을 포함 (대소문자 무시).
 * 여러 별칭이 일치하면 가장 긴(구체적인) 별칭의 query를 택한다.
 */
export function resolveAliasQuery(keywords: ModuleKeyword[] | undefined, search: string): string | null {
    const term = search.trim().toLowerCase()
    if (!term) return null
    let best: { keyword: string; query: string } | null = null
    for (const k of keywords ?? []) {
        if (typeof k === 'string' || !k.query) continue
        const kw = k.keyword.toLowerCase()
        if (kw.includes(term) || term.includes(kw)) {
            if (!best || kw.length > best.keyword.length) best = {keyword: kw, query: k.query}
        }
    }
    return best?.query ?? null
}
