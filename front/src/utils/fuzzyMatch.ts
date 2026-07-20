/**
 * VSCode/fzf류 커맨드 팔레트 표준 방식의 부분열(subsequence) 퍼지 매칭.
 * 검색어 글자가 대상 문자열에 순서대로만 나오면 매치(연속 불필요).
 * 매치되면 연속 매치·단어 경계 시작·이른 위치일수록 높은 점수를 반환하고, 매치 안 되면 0을 반환한다.
 */
export function fuzzyScore(text: string, query: string): number {
    const q = query.trim().toLowerCase()
    if (!q) return 0
    const t = text.toLowerCase()

    let score = 0
    let searchFrom = 0
    let firstMatchIndex = -1
    let prevMatchIndex = -1
    let consecutiveRun = 0

    for (const ch of q) {
        const foundAt = t.indexOf(ch, searchFrom)
        if (foundAt === -1) return 0

        if (firstMatchIndex === -1) firstMatchIndex = foundAt

        let charScore = 10
        const isWordBoundary = foundAt === 0 || t[foundAt - 1] === ' '
        if (isWordBoundary) charScore += 8

        if (prevMatchIndex === foundAt - 1) {
            consecutiveRun++
            charScore += 6 * consecutiveRun
        } else {
            consecutiveRun = 0
        }

        score += charScore
        prevMatchIndex = foundAt
        searchFrom = foundAt + 1
    }

    // 이른 위치에서 매치가 시작될수록 소폭 가산 (동점 시 tie-break)
    score += Math.max(0, 20 - firstMatchIndex)

    return score
}
