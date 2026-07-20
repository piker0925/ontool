import {describe, expect, it} from 'vitest'
import {convertTimezone} from './timezoneConvert'

describe('convertTimezone', () => {
    it('UTC → 서울(KST, UTC+9 고정, DST 없음): 00:00 UTC는 09:00 KST', () => {
        expect(convertTimezone('2026-01-01T00:00', 'UTC', 'Asia/Seoul')).toBe('2026-01-01T09:00')
    })

    it('서울(KST, UTC+9) → 뉴욕(여름철 EDT, UTC-4): 시차 13시간이라 날짜가 하루 당겨짐', () => {
        // 서울 09:00 - 13시간 = 전날 20:00 (독립적으로 계산한 시차)
        expect(convertTimezone('2026-07-20T09:00', 'Asia/Seoul', 'America/New_York')).toBe('2026-07-19T20:00')
    })

    it('역방향으로 변환하면 원래 날짜/시각으로 돌아옴(왕복 변환) — 중간값은 원값과 다름', () => {
        const converted = convertTimezone('2026-07-20T09:00', 'Asia/Seoul', 'America/New_York')
        expect(converted).not.toBe('2026-07-20T09:00')
        expect(convertTimezone(converted, 'America/New_York', 'Asia/Seoul')).toBe('2026-07-20T09:00')
    })
})
