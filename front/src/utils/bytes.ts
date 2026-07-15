// 바이트 ↔ 인코딩 변환 공용 헬퍼 (hmac·aes 등 크립토 도구 공유).

export function utf8ToBytes(s: string): Uint8Array {
    return new TextEncoder().encode(s)
}

export function bytesToUtf8(b: Uint8Array): string {
    return new TextDecoder().decode(b)
}

export function bytesToHex(b: Uint8Array): string {
    return Array.from(b, x => x.toString(16).padStart(2, '0')).join('')
}

export function hexToBytes(hex: string): Uint8Array {
    const clean = hex.trim().replace(/\s+/g, '')
    if (clean.length % 2 !== 0) throw new Error('hex 길이가 홀수입니다.')
    if (!/^[0-9a-fA-F]*$/.test(clean)) throw new Error('올바른 hex 문자열이 아닙니다.')
    const out = new Uint8Array(clean.length / 2)
    for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.substr(i * 2, 2), 16)
    return out
}

export function bytesToBase64(b: Uint8Array): string {
    let s = ''
    for (const x of b) s += String.fromCharCode(x)
    return btoa(s)
}

export function base64ToBytes(s: string): Uint8Array {
    return Uint8Array.from(atob(s.trim()), c => c.charCodeAt(0))
}

/** Uint8Array를 정확히 그 바이트만 담은 ArrayBuffer로 (Web Crypto/spark-md5 입력용). */
export function toArrayBuffer(b: Uint8Array): ArrayBuffer {
    return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer
}

export function concatBytes(...arrs: Uint8Array[]): Uint8Array {
    const len = arrs.reduce((n, a) => n + a.length, 0)
    const out = new Uint8Array(len)
    let o = 0
    for (const a of arrs) {
        out.set(a, o)
        o += a.length
    }
    return out
}
