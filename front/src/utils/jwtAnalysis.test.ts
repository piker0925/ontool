import {describe, expect, it} from 'vitest'
import {
    assessAlgorithm,
    claimCopyText,
    formatDuration,
    isLikelyUnixTimestamp,
    summarizeJwt,
    timestampToIso,
} from './jwtAnalysis'

describe('assessAlgorithm', () => {
    it('none은 critical', () => {
        expect(assessAlgorithm('none').risk).toBe('critical')
        expect(assessAlgorithm('None').risk).toBe('critical')
        expect(assessAlgorithm(undefined).risk).toBe('critical')
        expect(assessAlgorithm('').risk).toBe('critical')
    })
    it('표준 알고리즘은 ok', () => {
        expect(assessAlgorithm('HS256')).toMatchObject({risk: 'ok', label: 'HS256'})
        expect(assessAlgorithm('RS256').risk).toBe('ok')
        expect(assessAlgorithm('ES384').risk).toBe('ok')
        expect(assessAlgorithm('PS512').risk).toBe('ok')
    })
    it('HS 계열 노트에는 대칭키 경고 포함', () => {
        expect(assessAlgorithm('HS256').note).toContain('대칭키')
        expect(assessAlgorithm('RS256').note).not.toContain('대칭키')
    })
    it('알 수 없는 알고리즘은 warn', () => {
        expect(assessAlgorithm('HS1').risk).toBe('warn')
        expect(assessAlgorithm('MD5').risk).toBe('warn')
    })
})

describe('formatDuration', () => {
    it('초 단위', () => {
        expect(formatDuration(42)).toBe('42초')
        expect(formatDuration(0)).toBe('0초')
    })
    it('분+초', () => {
        expect(formatDuration(342)).toBe('5분 42초')
    })
    it('시간+분+초', () => {
        expect(formatDuration(3723)).toBe('1시간 2분 3초')
    })
    it('일 단위는 초 생략', () => {
        expect(formatDuration(90061)).toBe('1일 1시간 1분')
    })
    it('음수는 0으로 클램프', () => {
        expect(formatDuration(-5)).toBe('0초')
    })
})

describe('isLikelyUnixTimestamp', () => {
    it('초 단위 timestamp는 true', () => {
        expect(isLikelyUnixTimestamp(1700000000)).toBe(true)
    })
    it('밀리초 단위 timestamp도 true', () => {
        expect(isLikelyUnixTimestamp(1700000000000)).toBe(true)
    })
    it('작은 숫자/실수/문자열은 false', () => {
        expect(isLikelyUnixTimestamp(42)).toBe(false)
        expect(isLikelyUnixTimestamp(1700000000.5)).toBe(false)
        expect(isLikelyUnixTimestamp('1700000000')).toBe(false)
        expect(isLikelyUnixTimestamp(1e15)).toBe(false)
    })
})

describe('timestampToIso', () => {
    it('초 단위 변환', () => {
        expect(timestampToIso(1700000000)).toBe('2023-11-14T22:13:20.000Z')
    })
    it('밀리초 단위 자동 판별', () => {
        expect(timestampToIso(1700000000000)).toBe('2023-11-14T22:13:20.000Z')
    })
})

describe('claimCopyText', () => {
    it('문자열은 원문 그대로 (따옴표 없음)', () => {
        expect(claimCopyText('hello')).toBe('hello')
    })
    it('숫자/불리언은 리터럴', () => {
        expect(claimCopyText(123)).toBe('123')
        expect(claimCopyText(true)).toBe('true')
    })
    it('배열/객체는 JSON 표현', () => {
        expect(claimCopyText(['a', 'b'])).toBe('["a","b"]')
        expect(claimCopyText({r: 1})).toBe('{"r":1}')
    })
})

describe('summarizeJwt', () => {
    const header = {alg: 'HS256', typ: 'JWT'}

    it('만료되지 않은 토큰', () => {
        const s = summarizeJwt(header, {sub: '1', exp: 2000, iat: 1000, custom: 'x'}, 1500)
        expect(s.expired).toBe(false)
        expect(s.expDelta).toBe(500)
        expect(s.alg.risk).toBe('ok')
        expect(s.standardClaims).toBe(3) // sub, exp, iat
        expect(s.totalClaims).toBe(4)
    })
    it('만료된 토큰', () => {
        const s = summarizeJwt(header, {exp: 1000}, 1500)
        expect(s.expired).toBe(true)
        expect(s.expDelta).toBe(-500)
    })
    it('exp 없는 토큰은 expired null', () => {
        const s = summarizeJwt(header, {sub: '1'}, 1500)
        expect(s.expired).toBeNull()
        expect(s.expDelta).toBeNull()
    })
    it('nbf가 미래면 notYetValid', () => {
        expect(summarizeJwt(header, {nbf: 2000}, 1500).notYetValid).toBe(true)
        expect(summarizeJwt(header, {nbf: 1000}, 1500).notYetValid).toBe(false)
    })
    it('alg none이면 critical 전파', () => {
        expect(summarizeJwt({alg: 'none'}, {}, 0).alg.risk).toBe('critical')
    })
})
