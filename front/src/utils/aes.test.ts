import {beforeAll, describe, expect, it} from 'vitest'
import {aesDecrypt, aesEncrypt} from './aes'
import {bytesToBase64, utf8ToBytes} from './bytes'

const nodeCryptoPath = 'node:crypto'
const nodeBufferPath = 'node:buffer'

beforeAll(async () => {
    if (!globalThis.crypto?.subtle) {
        const {webcrypto} = await import(/* @vite-ignore */ nodeCryptoPath)
        Object.defineProperty(globalThis, 'crypto', {value: webcrypto, configurable: true})
    }
})

describe('aesEncrypt — 독립 오라클(Node crypto)과 동일', () => {
    it('CBC 명시 IV → Node aes-128-cbc(PKCS7)와 바이트 일치', async () => {
        const key = '0123456789abcdef'  // 정확히 16바이트 → AES-128, 패딩 없음
        const ivHex = '00112233445566778899aabbccddeeff'
        const text = 'Attack at dawn!'
        const node = await import(/* @vite-ignore */ nodeCryptoPath)
        const {Buffer} = await import(/* @vite-ignore */ nodeBufferPath)
        const cipher = node.createCipheriv('aes-128-cbc', Buffer.from(key, 'utf8'), Buffer.from(ivHex, 'hex'))
        const expectedHex = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]).toString('hex')

        expect(await aesEncrypt(text, key, 'CBC', 'hex', ivHex)).toBe(expectedHex)
    })
})

describe('aesEncrypt/Decrypt — 라운드트립 + 암호문≠평문', () => {
    for (const mode of ['CBC', 'GCM', 'CTR'] as const) {
        it(`${mode}: 암호화→복호화 == 원본, 암호문은 평문과 다름`, async () => {
            const text = '한글 plaintext 123 🔐'
            const key = 'my-secret-key'
            const cipher = await aesEncrypt(text, key, mode, 'base64')
            // 중간값(암호문)이 원본과 실제로 달라졌는지 — "아무 일도 안 하는 구현" 방지
            expect(cipher).not.toBe(bytesToBase64(utf8ToBytes(text)))
            expect(cipher.length).toBeGreaterThan(0)
            expect(await aesDecrypt(cipher, key, mode, 'base64')).toBe(text)
        })
    }

    it('임의 IV라 같은 입력도 매번 다른 암호문(IV prepend)', async () => {
        const a = await aesEncrypt('same', 'key', 'CBC', 'base64')
        const b = await aesEncrypt('same', 'key', 'CBC', 'base64')
        expect(a).not.toBe(b)
    })
})

describe('aesDecrypt — 검증', () => {
    it('GCM 잘못된 키는 복호화 실패(태그 불일치)', async () => {
        const cipher = await aesEncrypt('secret', 'right-key', 'GCM', 'base64')
        await expect(aesDecrypt(cipher, 'wrong-key', 'GCM', 'base64')).rejects.toThrow(/복호화/)
    })

    it('잘못된 IV 길이는 예외', async () => {
        await expect(aesEncrypt('x', 'key', 'CBC', 'hex', 'abcd')).rejects.toThrow(/IV/)
    })
})
