// 완벽한 형태소 분석은 범위 밖 — 흔한 조사를 접미사로 벗겨내는 간단한 규칙만 적용한다 (issue #077).
const PARTICLES = [
    '으로는', '에서는', '이라서', '하고는', '까지는',
    '으로', '에서', '부터', '까지', '이다', '입니다', '하고', '에게', '한테', '조차', '마저', '밖에', '이나', '께서',
    // 단독 "나"(or, 예: "사과나 바나나")는 제외 — "바나나"처럼 흔한 명사 어미와 겹쳐 오탐이 잦다.
    '은', '는', '이', '가', '을', '를', '의', '에', '와', '과', '도', '만', '로',
].sort((a, b) => b.length - a.length)

const STOPWORDS = new Set([
    '그리고', '그러나', '하지만', '그래서', '또는', '그런데', '따라서', '그러므로', '즉', '등', '및',
    '이것', '저것', '그것', '이거', '저거', '그거', '것', '수', '때', '중', '더', '좀', '잘', '또',
])

export interface WordFrequency {
    word: string
    count: number
}

// 어간이 1글자로 줄어드는 경우는 벗기지 않는다 — "사과"처럼 흔한 명사가 "과"(조사)로 끝나
// "사"로 잘못 잘리는 것을 막기 위한 보수적 기준 (완벽한 형태소 분석 없이는 완전히 피할 수 없다).
function stripParticle(token: string): string {
    for (const p of PARTICLES) {
        if (token.length - p.length >= 2 && token.endsWith(p)) return token.slice(0, -p.length)
    }
    return token
}

/** 텍스트에서 단어별 등장 빈도를 계산한다 (조사 제거 + 최소 불용어 필터링). 빈도 내림차순 정렬. */
export function computeWordFrequency(text: string): WordFrequency[] {
    const tokens = text.split(/\s+/).map(t => t.replace(/[^\p{L}\p{N}]/gu, '')).filter(Boolean)
    const counts = new Map<string, number>()
    for (const token of tokens) {
        const word = stripParticle(token)
        if (!word || STOPWORDS.has(word)) continue
        counts.set(word, (counts.get(word) ?? 0) + 1)
    }
    return Array.from(counts, ([word, count]) => ({word, count})).sort((a, b) => b.count - a.count)
}
