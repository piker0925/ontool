// 텍스트 라인 도구 — 줄 단위 정렬·중복 제거·구분자 join/split.

export type LineSortMode = 'none' | 'alpha' | 'numeric'
export type LineSeparatorMode = 'join' | 'split'

export interface LineToolOptions {
    sort: LineSortMode
    dedupe: boolean
    /** join: 출력을 합칠 구분자 / split: 입력을 나눌 구분자. 빈 문자열이면 줄바꿈이 기본값. */
    separator: string
    separatorMode: LineSeparatorMode
}

export function processTextLines(text: string, options: LineToolOptions): string {
    const sep = options.separator || '\n'
    let lines = options.separatorMode === 'split' ? text.split(sep) : text.split('\n')

    // Set은 첫 등장 순서를 보존하므로, 뒤이은 정렬 옵션이 최종 순서를 결정한다.
    if (options.dedupe) lines = Array.from(new Set(lines))

    if (options.sort === 'alpha') lines = [...lines].sort((a, b) => a.localeCompare(b, 'ko'))
    else if (options.sort === 'numeric') lines = [...lines].sort((a, b) => Number(a) - Number(b))

    const outSep = options.separatorMode === 'join' ? sep : '\n'
    return lines.join(outSep)
}
