import {afterAll, beforeAll, describe, expect, it} from 'vitest'
import {todayDateString} from './todayDateString'

describe('todayDateString', () => {
    let originalTz: string | undefined

    beforeAll(() => {
        // KST(UTC+9)로 강제 고정한다 — toISOString() 기반 구현이라면 자정 직후(로컬 00:xx)에
        // UTC로는 전날이라 실패하는 회귀를 이 타임존에서만 재현할 수 있다(UTC 실행환경에선 안 갈림).
        originalTz = process.env.TZ
        process.env.TZ = 'Asia/Seoul'
    })

    afterAll(() => {
        process.env.TZ = originalTz
    })

    it('로컬 달력 날짜를 YYYY-MM-DD로 반환한다', () => {
        expect(todayDateString(new Date(2026, 6, 20, 15, 0, 0))).toBe('2026-07-20')
    })

    it('KST 자정 직후에도 UTC로 하루 밀리지 않고 로컬 날짜 그대로 반환한다', () => {
        const kstMidnight = new Date(2026, 6, 20, 0, 30, 0) // KST 2026-07-20 00:30 = UTC 2026-07-19 15:30
        expect(todayDateString(kstMidnight)).toBe('2026-07-20')
        // 회귀 재현: toISOString() 기반 구현이었다면 이 값은 '2026-07-19'가 나왔을 것이다.
        expect(kstMidnight.toISOString().slice(0, 10)).toBe('2026-07-19')
    })
})
