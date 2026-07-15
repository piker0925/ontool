// URL 구성요소 분해 — 브라우저 URL API 기반. 서버 왕복 없음.

export interface UrlParts {
    scheme: string
    username?: string
    password?: string
    host: string
    /** 명시 포트 문자열, 스킴 기본 포트면 "(기본)" */
    port: string
    /** 디코드된 경로 (URL API는 최소 "/") */
    path: string
    /** 쿼리 파라미터. 반복 키·순서 보존, 값은 디코드됨 */
    query: Array<{ key: string; value: string }>
    /** 프래그먼트, 없으면 "(없음)" */
    fragment: string
}

export function parseUrl(input: string): UrlParts {
    const trimmed = input.trim()
    if (!trimmed) throw new Error('URL을 입력하세요.')

    let url: URL
    try {
        url = new URL(trimmed)
    } catch {
        throw new Error('유효하지 않은 URL 형식입니다. 스킴과 호스트가 필요합니다 (예: https://example.com).')
    }

    const query: Array<{ key: string; value: string }> = []
    for (const [key, value] of url.searchParams) query.push({key, value})

    let path = url.pathname
    try {
        path = decodeURIComponent(url.pathname)
    } catch {
        // 잘못된 % 시퀀스는 원본 유지
    }

    return {
        scheme: url.protocol.replace(/:$/, ''),
        username: url.username || undefined,
        password: url.password || undefined,
        host: url.hostname,
        port: url.port || '(기본)',
        path,
        query,
        fragment: url.hash ? url.hash.slice(1) : '(없음)',
    }
}
