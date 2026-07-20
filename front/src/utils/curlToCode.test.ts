import {describe, expect, it} from 'vitest'
import {generateJsFetch, generatePythonRequests, parseCurl} from './curlToCode'

describe('parseCurl', () => {
    it('URL만 있는 기본 curl 명령은 GET·헤더 없음·바디 없음으로 파싱된다', () => {
        const result = parseCurl('curl https://example.com/api/users')
        expect(result).toEqual({
            url: 'https://example.com/api/users',
            method: 'GET',
            headers: {},
            body: null,
        })
    })

    it('-X, -H, -d가 모두 있으면 메서드·헤더·바디가 정확히 파싱된다', () => {
        const result = parseCurl(
            'curl -X POST https://api.example.com/users -H "Content-Type: application/json" -H "Authorization: Bearer abc123" -d \'{"name":"foo"}\'',
        )
        expect(result).toEqual({
            url: 'https://api.example.com/users',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer abc123',
            },
            body: '{"name":"foo"}',
        })
    })

    it('-X 없이 -d만 있으면 메서드가 POST로 추론된다', () => {
        const result = parseCurl('curl https://example.com/api -d \'{"a":1}\'')
        expect(result.method).toBe('POST')
    })
})

const COMPLEX_CURL =
    'curl -X POST https://api.example.com/users -H "Content-Type: application/json" -H "Authorization: Bearer abc123" -d \'{"name":"foo"}\''

function extractFetchCall(code: string): { url: string; method: string; headers: Record<string, string>; body: string | null } {
    let captured: { url: string; method: string; headers: Record<string, string>; body: string | null } | null = null
    const fetchStub = (url: string, opts: { method: string; headers?: Record<string, string>; body?: string }) => {
        captured = {url, method: opts.method, headers: opts.headers ?? {}, body: opts.body ?? null}
    }
    // eslint-disable-next-line no-new-func
    const fn = new Function('fetch', code)
    fn(fetchStub)
    if (!captured) throw new Error('fetch가 호출되지 않았다')
    return captured
}

describe('generateJsFetch', () => {
    it('생성된 코드를 실행하면 curl과 동일한 URL·메서드·헤더·바디로 fetch가 호출된다', () => {
        const parsed = parseCurl(COMPLEX_CURL)
        const code = generateJsFetch(parsed)
        const captured = extractFetchCall(code)
        expect(captured.url).toBe(parsed.url)
        expect(captured.method).toBe(parsed.method)
        expect(captured.headers).toEqual(parsed.headers)
        expect(captured.body).toBe(parsed.body)
    })
})

describe('generateJsFetch — 헤더·바디 없는 단순 GET', () => {
    it('헤더·바디가 없으면 headers/body 필드 자체가 생략된다', () => {
        const parsed = parseCurl('curl https://example.com/api')
        const code = generateJsFetch(parsed)
        const captured = extractFetchCall(code)
        expect(captured.url).toBe('https://example.com/api')
        expect(captured.method).toBe('GET')
        expect(captured.headers).toEqual({})
        expect(captured.body).toBeNull()
        expect(code).not.toContain('headers:')
        expect(code).not.toContain('body:')
    })
})

describe('generatePythonRequests', () => {
    it('생성된 코드 문자열이 curl과 동일한 URL·메서드·헤더·바디를 필드 단위로 담는다', () => {
        const parsed = parseCurl(COMPLEX_CURL)
        const code = generatePythonRequests(parsed)

        expect(code).toMatch(new RegExp(`requests\\.${parsed.method.toLowerCase()}\\(`))

        const urlMatch = code.match(/requests\.\w+\(\s*"([^"]*)"/)
        expect(urlMatch?.[1]).toBe(parsed.url)

        for (const [key, value] of Object.entries(parsed.headers)) {
            expect(code).toContain(`"${key}": "${value}"`)
        }

        const bodyMatch = code.match(/data=(".*?")\)/)
        expect(bodyMatch).toBeTruthy()
        expect(JSON.parse(bodyMatch![1])).toBe(parsed.body)
    })
})
