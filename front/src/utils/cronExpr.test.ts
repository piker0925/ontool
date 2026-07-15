import {describe, expect, it} from 'vitest'
import {describeCron, nextCronRuns} from './cronExpr'

// 고정 기준 시각으로 결정성 확보. 2026-01-01T00:00:00Z = 목요일, KST 09:00.
const FROM = new Date('2026-01-01T00:00:00Z')

describe('nextCronRuns', () => {
    it('*/15 9 * * 1-5 (UTC) 평일 09시 15분 간격', () => {
        // 2026-01-01은 목요일(1-5 범위) → 당일 09:00/09:15/09:30 (UTC)
        expect(nextCronRuns('*/15 9 * * 1-5', 3, 'UTC', FROM)).toEqual([
            '2026-01-01 09:00:00',
            '2026-01-01 09:15:00',
            '2026-01-01 09:30:00',
        ])
    })

    it('0 0 * * * (매일 자정) Asia/Seoul — 타임존 반영', () => {
        // FROM은 KST 09:00 → 다음 KST 자정은 2026-01-02 00:00
        expect(nextCronRuns('0 0 * * *', 2, 'Asia/Seoul', FROM)).toEqual([
            '2026-01-02 00:00:00',
            '2026-01-03 00:00:00',
        ])
    })

    it('잘못된 표현식은 예외', () => {
        expect(() => nextCronRuns('nonsense', 1, 'UTC', FROM)).toThrow()
    })
})

describe('describeCron', () => {
    it('시각·요일이 설명 문자열에 반영된다', () => {
        // cronstrue ko: "오전 09:00, 월요일에만" 류 — 존재만이 아니라 내용을 확인
        const desc = describeCron('0 9 * * 1')
        expect(desc).toContain('09')
        expect(desc).toContain('월요일')
    })
})
