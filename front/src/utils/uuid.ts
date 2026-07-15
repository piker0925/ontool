export function generateUuid(): string {
    return crypto.randomUUID()
}

/**
 * UUID v7 (RFC 9562): 상위 48비트 = Unix 밀리초 타임스탬프, 나머지는 랜덤.
 * 시간순 정렬 가능한 UUID.
 */
export function generateUuidV7(timestampMs: number = Date.now()): string {
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)
    const ts = BigInt(timestampMs)
    for (let i = 0; i < 6; i++) {
        bytes[i] = Number((ts >> BigInt((5 - i) * 8)) & 0xffn)
    }
    bytes[6] = (bytes[6] & 0x0f) | 0x70  // version 7
    bytes[8] = (bytes[8] & 0x3f) | 0x80  // variant 10xx
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export type UuidExportFormat = 'lines' | 'json' | 'csv' | 'sql'

/** UUID 목록을 내보내기 형식 문자열로 변환한다. */
export function formatUuidExport(uuids: string[], format: UuidExportFormat): string {
    switch (format) {
        case 'lines':
            return uuids.join('\n')
        case 'json':
            return JSON.stringify(uuids)
        case 'csv':
            return ['uuid', ...uuids].join('\n')
        case 'sql':
            return `IN (${uuids.map(u => `'${u}'`).join(', ')})`
    }
}
