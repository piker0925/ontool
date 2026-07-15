import {describe, expect, it} from 'vitest'
import {formatUuidExport, generateUuid, generateUuidV7} from './uuid'

describe('generateUuid', () => {
    it('UUID v4 형식 반환', () => {
        const uuid = generateUuid()
        expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    })
    it('매번 다른 값', () => {
        expect(generateUuid()).not.toBe(generateUuid())
    })
})

describe('generateUuidV7', () => {
    it('버전 니블이 7, variant가 10xx', () => {
        const uuid = generateUuidV7()
        expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    })
    it('앞 48비트가 주어진 타임스탬프(밀리초)와 정확히 일치', () => {
        // 0x018f4df73e00 = 1715000000000
        const uuid = generateUuidV7(1715000000000)
        const first12Hex = uuid.replace(/-/g, '').slice(0, 12)
        expect(parseInt(first12Hex, 16)).toBe(1715000000000)
        expect(first12Hex).toBe('018f4df73e00')
    })
    it('타임스탬프 순서대로 문자열 정렬 가능', () => {
        const earlier = generateUuidV7(1700000000000)
        const later = generateUuidV7(1700000000001)
        expect(earlier < later).toBe(true)
        // 랜덤 부분이 달라도 같은 밀리초 이후 값이 항상 뒤에 온다
        const muchLater = generateUuidV7(1800000000000)
        expect(later < muchLater).toBe(true)
    })
    it('같은 타임스탬프여도 랜덤 부분은 매번 다름', () => {
        expect(generateUuidV7(1700000000000)).not.toBe(generateUuidV7(1700000000000))
    })
})

describe('formatUuidExport', () => {
    const uuids = ['aaa-111', 'bbb-222']
    it('줄바꿈 형식', () => {
        expect(formatUuidExport(uuids, 'lines')).toBe('aaa-111\nbbb-222')
    })
    it('JSON 배열 형식', () => {
        expect(formatUuidExport(uuids, 'json')).toBe('["aaa-111","bbb-222"]')
        expect(JSON.parse(formatUuidExport(uuids, 'json'))).toEqual(uuids)
    })
    it('CSV 형식 (헤더 포함)', () => {
        expect(formatUuidExport(uuids, 'csv')).toBe('uuid\naaa-111\nbbb-222')
    })
    it('SQL IN절 형식', () => {
        expect(formatUuidExport(uuids, 'sql')).toBe("IN ('aaa-111', 'bbb-222')")
    })
    it('단일 항목 SQL IN절', () => {
        expect(formatUuidExport(['x'], 'sql')).toBe("IN ('x')")
    })
})
