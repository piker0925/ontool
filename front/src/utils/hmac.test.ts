import {beforeAll, describe, expect, it} from 'vitest'
import {hmacSign} from './hmac'

// jsdom엔 crypto.subtle이 없으므로 Node webcrypto로 채운다 (브라우저는 기본 제공).
beforeAll(async () => {
    if (!globalThis.crypto?.subtle) {
        const nodeCryptoModule = 'node:crypto'
        const {webcrypto} = await import(/* @vite-ignore */ nodeCryptoModule)
        Object.defineProperty(globalThis, 'crypto', {value: webcrypto, configurable: true})
    }
})

// 기준값은 RFC 2202(HMAC-MD5/SHA1)·RFC 4231(HMAC-SHA512) 테스트 벡터 + 널리 알려진 HMAC-SHA256 값.
const KEY_0B_16 = '0b'.repeat(16)  // RFC 2202 MD5 case 1 키
const KEY_0B_20 = '0b'.repeat(20)  // RFC 2202/4231 SHA case 1 키

describe('hmacSign — RFC 테스트 벡터 (key=hex, "Hi There")', () => {
    it('HMAC-MD5 (RFC 2202)', async () => {
        expect(await hmacSign('Hi There', KEY_0B_16, 'HmacMD5', 'hex', 'hex'))
            .toBe('9294727a3638bb1c13f48ef8158bfc9d')
    })
    it('HMAC-SHA1 (RFC 2202)', async () => {
        expect(await hmacSign('Hi There', KEY_0B_20, 'HmacSHA1', 'hex', 'hex'))
            .toBe('b617318655057264e28bc0b6fb378c8ef146be00')
    })
    it('HMAC-SHA512 (RFC 4231)', async () => {
        expect(await hmacSign('Hi There', KEY_0B_20, 'HmacSHA512', 'hex', 'hex'))
            .toBe('87aa7cdea5ef619d4ff0b4241a1d6cb02379f4e2ce4ec2787ad0b30545e17cded' +
                'aa833b7d6b8a702038b274eaea3f4e4be9d914eeb61f1702e696c203a126854')
    })
})

describe('hmacSign — HmacSHA256 + 형식', () => {
    const HELLO_SECRET_HEX = '88aab3ede8d3adf94d26ab90d3bafd4a2083070c3bcce9c014ee04a443847c0b'

    it('utf8 키, hex 출력 (널리 알려진 값)', async () => {
        expect(await hmacSign('hello', 'secret', 'HmacSHA256', 'utf8', 'hex')).toBe(HELLO_SECRET_HEX)
    })

    it('base64 출력은 같은 다이제스트의 base64', async () => {
        const bufPath = 'node:buffer'
        const {Buffer} = await import(/* @vite-ignore */ bufPath)  // 변수 경로로 타입 우회, 독립 변환
        const expected = Buffer.from(HELLO_SECRET_HEX, 'hex').toString('base64')
        expect(await hmacSign('hello', 'secret', 'HmacSHA256', 'utf8', 'base64')).toBe(expected)
    })

    it('base64 키("c2VjcmV0"=secret)는 utf8 키와 동일 결과', async () => {
        expect(await hmacSign('hello', 'c2VjcmV0', 'HmacSHA256', 'base64', 'hex')).toBe(HELLO_SECRET_HEX)
    })
})

describe('hmacSign — 검증', () => {
    it('빈 키는 예외', async () => {
        await expect(hmacSign('hello', '', 'HmacSHA256', 'utf8', 'hex')).rejects.toThrow(/키/)
    })
})
