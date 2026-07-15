// AES 암호화/복호화 — 브라우저 로컬(Web Crypto). 키·평문이 서버로 전송되지 않는다.
// 모드: CBC / GCM / CTR. (ECB는 Web Crypto가 지원하지 않고 암호학적으로 비권장이라 제외.)
import {base64ToBytes, bytesToBase64, bytesToHex, bytesToUtf8, concatBytes, hexToBytes, toArrayBuffer, utf8ToBytes} from './bytes'

export type AesMode = 'CBC' | 'GCM' | 'CTR'
export type AesFormat = 'base64' | 'hex'

const IV_LEN: Record<AesMode, number> = {CBC: 16, GCM: 12, CTR: 16}
const ALGO: Record<AesMode, string> = {CBC: 'AES-CBC', GCM: 'AES-GCM', CTR: 'AES-CTR'}

/** UTF-8 키를 AES-128/192/256 길이(16/24/32바이트)로 패딩·절단. */
function padKey(key: string): Uint8Array {
    const raw = utf8ToBytes(key)
    const size = raw.length <= 16 ? 16 : raw.length <= 24 ? 24 : 32
    const out = new Uint8Array(size)
    out.set(raw.subarray(0, size))
    return out
}

function algoParams(mode: AesMode, iv: Uint8Array): AesCbcParams | AesGcmParams | AesCtrParams {
    if (mode === 'CBC') return {name: 'AES-CBC', iv: toArrayBuffer(iv)}
    if (mode === 'GCM') return {name: 'AES-GCM', iv: toArrayBuffer(iv)}
    return {name: 'AES-CTR', counter: toArrayBuffer(iv), length: 64}
}

async function importAesKey(key: string, mode: AesMode): Promise<CryptoKey> {
    return crypto.subtle.importKey('raw', toArrayBuffer(padKey(key)), {name: ALGO[mode]}, false, ['encrypt', 'decrypt'])
}

function parseIv(ivHex: string | undefined, ivLen: number, mode: AesMode): Uint8Array | null {
    if (!ivHex || !ivHex.trim()) return null
    const iv = hexToBytes(ivHex)
    if (iv.length !== ivLen) throw new Error(`${mode} IV는 ${ivLen}바이트(hex ${ivLen * 2}자)여야 합니다.`)
    return iv
}

/** 암호화. 사용자 IV를 주면 그것을 쓰고 암호문만, 없으면 임의 IV를 생성해 IV||암호문으로 반환. */
export async function aesEncrypt(text: string, key: string, mode: AesMode = 'CBC', format: AesFormat = 'base64', ivHex?: string): Promise<string> {
    const ck = await importAesKey(key, mode)
    const ivLen = IV_LEN[mode]
    const userIv = parseIv(ivHex, ivLen, mode)
    const iv = userIv ?? crypto.getRandomValues(new Uint8Array(ivLen))

    const ct = new Uint8Array(await crypto.subtle.encrypt(algoParams(mode, iv), ck, toArrayBuffer(utf8ToBytes(text))))
    const out = userIv ? ct : concatBytes(iv, ct)
    return format === 'hex' ? bytesToHex(out) : bytesToBase64(out)
}

/** 복호화. 사용자 IV를 주면 전체가 암호문, 없으면 앞 IV 길이만큼을 IV로 분리. */
export async function aesDecrypt(cipher: string, key: string, mode: AesMode = 'CBC', format: AesFormat = 'base64', ivHex?: string): Promise<string> {
    const ck = await importAesKey(key, mode)
    const ivLen = IV_LEN[mode]

    let data: Uint8Array
    try {
        data = format === 'hex' ? hexToBytes(cipher.trim()) : base64ToBytes(cipher)
    } catch {
        throw new Error(`암호문이 올바른 ${format} 형식이 아닙니다.`)
    }

    const userIv = parseIv(ivHex, ivLen, mode)
    let iv: Uint8Array
    let ct: Uint8Array
    if (userIv) {
        iv = userIv
        ct = data
    } else {
        if (data.length < ivLen) throw new Error('암호문이 IV보다 짧습니다.')
        iv = data.subarray(0, ivLen)
        ct = data.subarray(ivLen)
    }

    try {
        const pt = await crypto.subtle.decrypt(algoParams(mode, iv), ck, toArrayBuffer(ct))
        return bytesToUtf8(new Uint8Array(pt))
    } catch {
        throw new Error('복호화에 실패했습니다. 키·IV·모드·형식이 암호화 시와 같은지 확인하세요.')
    }
}
