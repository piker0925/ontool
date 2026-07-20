/**
 * 오디오 도구 5종의 다운로드 파일명을 "원본 파일명 + 도구별 접미사"로 조합하는 순수 함수.
 * DOM/오디오 API와 무관해 vitest에서 바로 단위 테스트할 수 있다.
 */
export function stripExtension(fileName: string): string {
    const dotIndex = fileName.lastIndexOf('.')
    // 확장자가 없거나(dotIndex === -1) 파일명이 점으로 시작만 하는 경우(dotIndex === 0, 예:
    // ".wav")는 그대로 둔다 — 잘라내면 빈 문자열이 되어 더 이상하다.
    if (dotIndex <= 0) return fileName
    return fileName.slice(0, dotIndex)
}

export function buildResultFileNameBase(originalFileName: string, suffix: string): string {
    const base = stripExtension(originalFileName) || 'result'
    return `${base}_${suffix}`
}

// 피치(+3/-3)·게인(+5db/-5db)·정규화(-1db) 등 부호 있는 숫자를 파일명 접미사에 넣을 때
// 공통으로 쓰는 표기 규칙 — 양수는 '+'를 붙이고 음수는 이미 '-'를 갖고 있으니 그대로 둔다.
export function formatSigned(value: number): string {
    return `${value >= 0 ? '+' : ''}${value}`
}
