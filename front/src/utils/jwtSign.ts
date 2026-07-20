// JWT 생성·서명 검증 — 브라우저 로컬 HS256 전용. 키는 서버로 전송하지 않는다.
import {encodeBase64Url} from './encoding'
import {bytesToBase64Url, toArrayBuffer, utf8ToBytes} from './bytes'
import {decodeJwt} from './jwtDecode'

async function hmacSha256Base64Url(text: string, secret: string): Promise<string> {
    const key = await crypto.subtle.importKey(
        'raw', toArrayBuffer(utf8ToBytes(secret)),
        {name: 'HMAC', hash: 'SHA-256'}, false, ['sign'],
    )
    const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, toArrayBuffer(utf8ToBytes(text))))
    return bytesToBase64Url(mac)
}

/** 페이로드(JSON 객체 문자열) + secret으로 HS256 서명된 테스트 토큰을 만든다. */
export async function signJwt(payloadJson: string, secret: string): Promise<string> {
    if (!secret) throw new Error('서명 키(secret)는 필수입니다.')
    let payload: unknown
    try {
        payload = JSON.parse(payloadJson)
    } catch {
        throw new Error('페이로드가 올바른 JSON이 아닙니다.')
    }
    if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
        throw new Error('페이로드는 JSON 객체({...})여야 합니다.')
    }

    const headerB64 = encodeBase64Url(JSON.stringify({alg: 'HS256', typ: 'JWT'}))
    const payloadB64 = encodeBase64Url(JSON.stringify(payload))
    const signingInput = `${headerB64}.${payloadB64}`
    const signatureB64 = await hmacSha256Base64Url(signingInput, secret)
    return `${signingInput}.${signatureB64}`
}

/**
 * HS256 토큰의 서명을 secret으로 재계산해 검증한다.
 * HS256이 아니거나(RS/ES/none 등, 대칭키만으로 검증 불가) 형식이 잘못된 토큰은 null(검증 불가).
 */
export async function verifyJwtSignature(token: string, secret: string): Promise<boolean | null> {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    let header: unknown
    try {
        header = decodeJwt(token).header
    } catch {
        return null
    }
    const alg = (header as Record<string, unknown> | null)?.alg
    if (alg !== 'HS256') return null

    const signingInput = `${parts[0]}.${parts[1]}`
    const expected = await hmacSha256Base64Url(signingInput, secret)
    return expected === parts[2]
}
