// HTML 엔티티 인코드/디코드 — 브라우저 로컬. 표준 라이브러리 he로 full named-entity 지원.
import he from 'he'

export function encodeHtmlEntities(text: string): string {
    return he.encode(text, {useNamedReferences: true})
}

export function decodeHtmlEntities(text: string): string {
    return he.decode(text)
}
