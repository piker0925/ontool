// 이미지 파일 ↔ Base64 data URI 변환 — 브라우저 로컬.
import {base64ToBytes, bytesToBase64} from './bytes'

export function bytesToDataUri(bytes: Uint8Array, mime: string): string {
    return `data:${mime};base64,${bytesToBase64(bytes)}`
}

const DATA_URI_RE = /^data:[^;]+;base64,([\s\S]+)$/

export function dataUriToBase64(value: string): string {
    const trimmed = value.trim()
    const match = trimmed.match(DATA_URI_RE)
    return match ? match[1] : trimmed
}

export function dataUriToBytes(value: string): Uint8Array {
    return base64ToBytes(dataUriToBase64(value))
}

/** data URI가 아니면(순수 base64 문자열) fallbackMime의 data URI로 감싼다. */
export function normalizeToDataUri(value: string, fallbackMime = 'image/png'): string {
    const trimmed = value.trim()
    if (trimmed.startsWith('data:')) return trimmed
    return `data:${fallbackMime};base64,${trimmed}`
}

export function fileToDataUri(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(reader.error ?? new Error('파일을 읽을 수 없습니다.'))
        reader.readAsDataURL(file)
    })
}
