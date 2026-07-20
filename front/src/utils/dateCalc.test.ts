import {describe, expect, it} from 'vitest'
import {calcBabyAge, calcDueDate, calcGestationalWeeks, calcInternationalAge, daysBetween, formatDday} from './dateCalc'

describe('daysBetween', () => {
    it('윤년(2024) 2월을 포함하는 구간은 29일(2월 29일 포함)', () => {
        expect(daysBetween('2024-02-01', '2024-03-01')).toBe(29)
    })
    it('평년(2023) 2월을 포함하는 구간은 28일', () => {
        expect(daysBetween('2023-02-01', '2023-03-01')).toBe(28)
    })
    it('to가 from보다 이전이면 음수로 반환됨(부호 있는 차이)', () => {
        expect(daysBetween('2024-03-01', '2024-02-01')).toBe(-29)
    })
})

describe('formatDday', () => {
    it('목표일이 오늘보다 미래면 D-N', () => {
        expect(formatDday(5)).toBe('D-5')
    })
    it('목표일이 오늘보다 과거면 D+N', () => {
        expect(formatDday(-3)).toBe('D+3')
    })
    it('목표일이 오늘이면 D-DAY', () => {
        expect(formatDday(0)).toBe('D-DAY')
    })
})

describe('calcInternationalAge (만 나이)', () => {
    it('생일이 기준일보다 이미 지난 경우 — 연도 차 그대로', () => {
        expect(calcInternationalAge('2000-01-15', '2026-07-20')).toBe(26)
    })
    it('생일이 기준일에 아직 안 지난 경우 — 연도 차에서 1을 뺌(단순 연도 차만 계산하면 틀림)', () => {
        expect(calcInternationalAge('2000-12-25', '2026-07-20')).toBe(25)
    })
    it('기준일이 생일 당일이면 이미 생일이 지난 것으로 처리(그 해 나이 적용)', () => {
        expect(calcInternationalAge('2000-07-20', '2026-07-20')).toBe(26)
    })
})

describe('calcBabyAge (육아 개월수)', () => {
    it('출생일부터 경과한 개월 수와 남은 일수를 계산', () => {
        expect(calcBabyAge('2026-01-15', '2026-07-20')).toEqual({months: 6, days: 5})
    })
    it('해를 넘긴 경우에도 정확히 계산', () => {
        expect(calcBabyAge('2025-09-10', '2026-07-20')).toEqual({months: 10, days: 10})
    })
    it('출생일이 31일처럼 월말이라 경과 개월 수 계산 시 짧은 달을 거쳐도 일수가 음수로 내려가지 않음', () => {
        // 1/31 -> 2/28(2026은 평년, 28일까지=1개월 경과) -> 3/1(+1일) = 1개월 1일
        expect(calcBabyAge('2026-01-31', '2026-03-01')).toEqual({months: 1, days: 1})
    })
})

describe('calcDueDate (출산예정일, 네겔레 법칙)', () => {
    it('최종 월경일 + 280일(40주)', () => {
        expect(calcDueDate('2026-01-01')).toBe('2026-10-08')
    })
})

describe('calcGestationalWeeks (임신 주수)', () => {
    it('최종 월경일부터 기준일까지 경과 주수와 남은 일수', () => {
        expect(calcGestationalWeeks('2026-01-01', '2026-07-20')).toEqual({weeks: 28, days: 4})
    })
})
