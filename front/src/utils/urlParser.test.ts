import {describe, expect, it} from 'vitest'
import {parseUrl} from './urlParser'

describe('parseUrl — 전체 구성요소', () => {
    it('user:pw, 포트, 인코딩 경로, 쿼리(한글), 프래그먼트', () => {
        const r = parseUrl('https://user:pw@example.com:8080/a%20b?x=1&y=%ED%95%9C#frag')
        expect(r.scheme).toBe('https')
        expect(r.username).toBe('user')
        expect(r.password).toBe('pw')
        expect(r.host).toBe('example.com')
        expect(r.port).toBe('8080')
        expect(r.path).toBe('/a b')            // %20 디코드
        expect(r.query).toEqual([{key: 'x', value: '1'}, {key: 'y', value: '한'}])  // %ED%95%9C = 한
        expect(r.fragment).toBe('frag')
    })
})

describe('parseUrl — 기본값·빈 값', () => {
    it('포트 없음 → (기본), 경로 없음, 쿼리 없음, 프래그먼트 없음', () => {
        const r = parseUrl('http://example.com')
        expect(r.scheme).toBe('http')
        expect(r.host).toBe('example.com')
        expect(r.port).toBe('(기본)')
        expect(r.path).toBe('/')
        expect(r.query).toEqual([])
        expect(r.fragment).toBe('(없음)')
        expect(r.username).toBeUndefined()
        expect(r.password).toBeUndefined()
    })

    it('username만 있고 password 없음', () => {
        const r = parseUrl('https://user@example.com/')
        expect(r.username).toBe('user')
        expect(r.password).toBeUndefined()
    })

    it('명시 포트가 스킴 기본 포트여도 표시한다', () => {
        // URL API는 기본 포트(https:443)를 빈 문자열로 정규화 → (기본)
        expect(parseUrl('https://example.com:443/').port).toBe('(기본)')
        expect(parseUrl('https://example.com:8443/').port).toBe('8443')
    })

    it('반복 키 쿼리를 순서대로 모두 보존', () => {
        expect(parseUrl('https://h/?a=1&a=2&b=3').query).toEqual([
            {key: 'a', value: '1'}, {key: 'a', value: '2'}, {key: 'b', value: '3'},
        ])
    })
})

describe('parseUrl — 에러', () => {
    it('스킴 없는 문자열은 예외', () => {
        expect(() => parseUrl('example.com/path')).toThrow()
    })
    it('빈 입력은 예외', () => {
        expect(() => parseUrl('   ')).toThrow()
    })
})
