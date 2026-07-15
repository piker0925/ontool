import {describe, expect, it} from 'vitest'
import {decodeJwt} from './jwtDecode'

describe('decodeJwt', () => {
    // header: {"alg":"HS256","typ":"JWT"}, payload: {"sub":"1234567890","name":"John Doe","iat":1516239022}
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'

    it('헤더 파싱', () => {
        const {header} = decodeJwt(token)
        expect(header).toEqual({alg: 'HS256', typ: 'JWT'})
    })
    it('페이로드 파싱', () => {
        const {payload} = decodeJwt(token)
        expect((payload as { sub: string }).sub).toBe('1234567890')
    })
    it('잘못된 형식은 에러', () => {
        expect(() => decodeJwt('not.a.jwt')).toThrow()
    })
})
