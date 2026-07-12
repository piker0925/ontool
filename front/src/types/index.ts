/**
 * 검색 별칭. 문자열이면 단순 검색어,
 * 객체면 딥링크 지원 별칭 — 해당 별칭으로 검색해 선택하면 query가 붙은 URL로 이동한다.
 * 예: encoder의 {keyword: 'base64', query: 'mode=base64-encode'}
 */
export type ModuleKeyword = string | { keyword: string; query?: string }

export interface Module {
    id: string
    name: string
    category: string
    isHeavy: boolean
    isFrontendOnly?: boolean
    description?: string
    /** 검색 별칭 (통합 도구가 흡수한 기존 도구명 등) */
    keywords?: ModuleKeyword[]
}

export interface Job {
    id: string
    status: string
    resultUrl?: string | null
    resultText?: string | null
}

// 업로드 응답: 단건(Job 1개) 또는 배치(파일당 Job N개 → ZIP)
export type UploadResult =
    | { jobId: string }
    | { batchId: string; jobIds: string[] }

export interface BatchProgress {
    batchId: string
    totalCount: number
    doneCount: number
    failCount: number
}

export function isBatchResult(r: UploadResult): r is { batchId: string; jobIds: string[] } {
    return 'batchId' in r
}
