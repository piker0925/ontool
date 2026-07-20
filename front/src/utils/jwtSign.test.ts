import {beforeAll, describe, expect, it} from 'vitest'
import {signJwt, verifyJwtSignature} from './jwtSign'
import {decodeJwt} from './jwtDecode'
import {encodeBase64Url} from './encoding'

// jsdom엔 crypto.subtle이 없으므로 Node webcrypto로 채운다 (브라우저는 기본 제공).
beforeAll(async () => {
    if (!globalThis.crypto?.subtle) {
        const nodeCryptoModule = 'node:crypto'
        const {webcrypto} = await import(/* @vite-ignore */ nodeCryptoModule)
        Object.defineProperty(globalThis, 'crypto', {value: webcrypto, configurable: true})
    }
})

describe('signJwt', () => {
    it('생성한 토큰을 디코드하면 원래 페이로드가 정확히 복원된다 (라운드트립)', async () => {
        const payload = {sub: '1234567890', name: 'Hong Gildong', role: 'admin'}
        const token = await signJwt(JSON.stringify(payload), 'my-secret')
        const {header, payload: decodedPayload} = decodeJwt(token)
        expect(header).toEqual({alg: 'HS256', typ: 'JWT'})
        expect(decodedPayload).toEqual(payload)
    })

    it('서명 세그먼트를 포함한 3파트 JWT 형식을 만든다', async () => {
        const token = await signJwt('{"a":1}', 'secret')
        const parts = token.split('.')
        expect(parts).toHaveLength(3)
        expect(parts[2].length).toBeGreaterThan(0)
    })

    it('같은 페이로드+secret이면 항상 같은 서명 (결정적)', async () => {
        const a = await signJwt('{"a":1}', 'secret')
        const b = await signJwt('{"a":1}', 'secret')
        expect(a).toBe(b)
    })

    it('secret이 다르면 서명도 달라진다', async () => {
        const a = await signJwt('{"a":1}', 'secret-1')
        const b = await signJwt('{"a":1}', 'secret-2')
        expect(a.split('.')[2]).not.toBe(b.split('.')[2])
    })

    it('빈 secret은 에러', async () => {
        await expect(signJwt('{"a":1}', '')).rejects.toThrow(/secret|키/)
    })

    it('페이로드가 올바른 JSON이 아니면 에러', async () => {
        await expect(signJwt('not json', 'secret')).rejects.toThrow()
    })

    it('페이로드가 JSON 객체가 아니면 에러 (배열 등)', async () => {
        await expect(signJwt('[1,2,3]', 'secret')).rejects.toThrow()
    })
})

describe('verifyJwtSignature', () => {
    it('올바른 secret이면 true', async () => {
        const token = await signJwt('{"sub":"1"}', 'correct-secret')
        expect(await verifyJwtSignature(token, 'correct-secret')).toBe(true)
    })

    it('잘못된 secret이면 false (서명 불일치)', async () => {
        const token = await signJwt('{"sub":"1"}', 'correct-secret')
        expect(await verifyJwtSignature(token, 'wrong-secret')).toBe(false)
    })

    it('HS256이 아닌 alg는 검증 불가 → null', async () => {
        // header: {"alg":"RS256","typ":"JWT"} 인 임의 토큰
        const header = encodeBase64Url(JSON.stringify({alg: 'RS256', typ: 'JWT'}))
        const payload = encodeBase64Url(JSON.stringify({sub: '1'}))
        const token = `${header}.${payload}.sig`
        expect(await verifyJwtSignature(token, 'secret')).toBeNull()
    })

    it('형식이 아예 잘못된 토큰은 null', async () => {
        expect(await verifyJwtSignature('not-a-jwt', 'secret')).toBeNull()
    })
})
