// HMAC 서명 — 브라우저 로컬. SHA 계열은 Web Crypto, MD5는 Web Crypto 미지원이라 spark-md5로 직접 HMAC 구성.
// 키는 서버로 전송하지 않는다.
import SparkMD5 from 'spark-md5'
import {base64ToBytes, bytesToBase64, bytesToHex, concatBytes, hexToBytes, toArrayBuffer, utf8ToBytes} from './bytes'

export type HmacAlgorithm = 'HmacSHA1' | 'HmacSHA256' | 'HmacSHA512' | 'HmacMD5'
export type KeyFormat = 'utf8' | 'hex' | 'base64'
export type HmacOutputFormat = 'hex' | 'base64'

const SUBTLE_HASH: Record<Exclude<HmacAlgorithm, 'HmacMD5'>, string> = {
    HmacSHA1: 'SHA-1',
    HmacSHA256: 'SHA-256',
    HmacSHA512: 'SHA-512',
}

function decodeKey(key: string, format: KeyFormat): Uint8Array {
    switch (format) {
        case 'utf8':
            return utf8ToBytes(key)
        case 'hex':
            return hexToBytes(key)
        case 'base64':
            return base64ToBytes(key)
        default:
            throw new Error(`지원하지 않는 키 형식입니다: ${format}`)
    }
}

function md5Bytes(bytes: Uint8Array): Uint8Array {
    return hexToBytes(SparkMD5.ArrayBuffer.hash(toArrayBuffer(bytes)))
}

/** RFC 2104 HMAC-MD5 (Web Crypto가 MD5를 지원하지 않아 직접 구성). blockSize=64. */
function hmacMd5(key: Uint8Array, msg: Uint8Array): Uint8Array {
    const blockSize = 64
    const k = key.length > blockSize ? md5Bytes(key) : key
    const kPad = new Uint8Array(blockSize)
    kPad.set(k)
    const ipad = new Uint8Array(blockSize)
    const opad = new Uint8Array(blockSize)
    for (let i = 0; i < blockSize; i++) {
        ipad[i] = kPad[i] ^ 0x36
        opad[i] = kPad[i] ^ 0x5c
    }
    const inner = md5Bytes(concatBytes(ipad, msg))
    return md5Bytes(concatBytes(opad, inner))
}

export async function hmacSign(
    text: string,
    key: string,
    algorithm: HmacAlgorithm = 'HmacSHA256',
    keyFormat: KeyFormat = 'utf8',
    outputFormat: HmacOutputFormat = 'hex',
): Promise<string> {
    const keyBytes = decodeKey(key, keyFormat)
    if (keyBytes.length === 0) throw new Error('서명 키는 필수입니다.')
    const msg = utf8ToBytes(text)

    let mac: Uint8Array
    if (algorithm === 'HmacMD5') {
        mac = hmacMd5(keyBytes, msg)
    } else {
        const cryptoKey = await crypto.subtle.importKey(
            'raw', toArrayBuffer(keyBytes),
            {name: 'HMAC', hash: SUBTLE_HASH[algorithm]}, false, ['sign'],
        )
        mac = new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, toArrayBuffer(msg)))
    }
    return outputFormat === 'hex' ? bytesToHex(mac) : bytesToBase64(mac)
}
