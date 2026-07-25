import {describe, expect, it} from 'vitest'
import {
    annualToMonthly,
    calcAnnualLeaveDays,
    calcAverageDailyWage,
    calcWeeklyHolidayPay,
    daysBetweenInclusive,
    threeMonthPeriodDays,
    calcMonthlyNetPay,
    calcMonthlyNetPayWithNonTaxable,
    calcNationalPension,
    calcSeverancePay,
    childTaxCredit,
    hourlyToMonthly,
    isBelowMinimumWage2026,
    localIncomeTax,
    lookupMonthlyWithholdingTax,
    monthlyToAnnual,
    monthlyToHourly,
    overtimePay,
    weeklyOvertimeHours,
} from './salaryCalc'
import {MINIMUM_WAGE_2026_HOURLY, MINIMUM_WAGE_2026_MONTHLY_209H, NATIONAL_PENSION_INCOME_CAP_2026H2} from './salaryRates2026'

describe('hourlyToMonthly', () => {
    it('2026년 최저시급을 월 209시간 기준으로 환산하면 고용노동부 확정 월 환산액과 일치', () => {
        expect(hourlyToMonthly(MINIMUM_WAGE_2026_HOURLY)).toBe(MINIMUM_WAGE_2026_MONTHLY_209H)
    })
})

describe('monthlyToHourly', () => {
    it('2026년 최저임금 월 환산액을 시급으로 역산하면 고용노동부 확정 시급과 일치', () => {
        expect(monthlyToHourly(MINIMUM_WAGE_2026_MONTHLY_209H)).toBe(MINIMUM_WAGE_2026_HOURLY)
    })
})

describe('monthlyToAnnual / annualToMonthly', () => {
    it('월급 250만원은 연봉 3000만원(12개월분)', () => {
        expect(monthlyToAnnual(2_500_000)).toBe(30_000_000)
    })
    it('연봉 3000만원은 월급 250만원(12분의 1)으로 역산됨(라운드트립)', () => {
        expect(annualToMonthly(30_000_000)).toBe(2_500_000)
    })
})

describe('isBelowMinimumWage2026', () => {
    it('2026년 최저시급 미만이면 true', () => {
        expect(isBelowMinimumWage2026(MINIMUM_WAGE_2026_HOURLY - 1)).toBe(true)
    })
    it('2026년 최저시급 이상이면 false', () => {
        expect(isBelowMinimumWage2026(MINIMUM_WAGE_2026_HOURLY)).toBe(false)
    })
})

describe('weeklyOvertimeHours', () => {
    it('주 45시간 근무는 기준 40시간 대비 초과근무 5시간', () => {
        expect(weeklyOvertimeHours(45)).toBe(5)
    })
    it('주 40시간 이하 근무는 초과근무 0시간(음수로 내려가지 않음)', () => {
        expect(weeklyOvertimeHours(35)).toBe(0)
    })
})

describe('overtimePay', () => {
    it('시급 1만원, 주 45시간 근무 시 근로기준법 가산율(1.5배) 적용해 초과근무수당 75,000원', () => {
        expect(overtimePay(10000, 45)).toBe(75000)
    })
    it('초과근무가 없으면 수당 0원', () => {
        expect(overtimePay(10000, 35)).toBe(0)
    })
})

describe('daysBetweenInclusive', () => {
    it('2025-01-01 입사, 2025-12-31 퇴사(비윤년 1년)면 재직일수 365일(입사일을 1일차로 포함)', () => {
        expect(daysBetweenInclusive('2025-01-01', '2025-12-31')).toBe(365)
    })
    it('입사일과 퇴사일이 같으면 1일', () => {
        expect(daysBetweenInclusive('2025-05-01', '2025-05-01')).toBe(1)
    })
})

describe('threeMonthPeriodDays', () => {
    it('퇴사일 2025-04-30 기준 직전 3개월(2025-01-30~04-30)은 90일(연도별 일수로 검산: 1/30=30일째, 4/30=120일째 → 차이 90일)', () => {
        expect(threeMonthPeriodDays('2025-04-30')).toBe(90)
    })
})

describe('calcAverageDailyWage', () => {
    it('퇴직 전 3개월 임금총액 900만원 / 총 90일이면 1일 평균임금 10만원', () => {
        expect(calcAverageDailyWage(9_000_000, 90)).toBe(100_000)
    })
    it('연간 상여금 1200만원·연차수당 240만원이 있으면 3/12 안분액(300만원+60만원)이 가산되어 1일 평균임금이 14만원으로 올라감', () => {
        expect(calcAverageDailyWage(9_000_000, 90, 12_000_000, 2_400_000)).toBe(140_000)
    })
    it('상여금·연차수당을 생략하면(기본값 0) 기존 단순 계산과 동일', () => {
        expect(calcAverageDailyWage(9_000_000, 90, 0, 0)).toBe(calcAverageDailyWage(9_000_000, 90))
    })
})

describe('calcSeverancePay', () => {
    it('근로기준법 공식(평균임금 30일분 × 근속연수) — 1일 평균임금 10만원, 근속 365일(1년)이면 퇴직금 300만원', () => {
        expect(calcSeverancePay(100_000, 365)).toBe(3_000_000)
    })
    it('근속 1년 미만(180일)이면 퇴직금이 1년치보다 적고, 근속일수에 비례한 값(1,479,452원)이 됨', () => {
        expect(calcSeverancePay(100_000, 180)).toBeLessThan(calcSeverancePay(100_000, 365))
        expect(calcSeverancePay(100_000, 180)).toBe(1_479_452)
    })
})

describe('lookupMonthlyWithholdingTax (2026년 근로소득 간이세액표, docs/근로소득 간이세액표_2026.03.01.xlsx 원본 대조)', () => {
    it('월급여 250만원, 공제대상가족 1명 → 표의 실제 수치 35,600원', () => {
        expect(lookupMonthlyWithholdingTax(2_500_000, 1)).toBe(35_600)
    })
    it('월급여 500만원, 공제대상가족 1명 → 표의 실제 수치 335,470원', () => {
        expect(lookupMonthlyWithholdingTax(5_000_000, 1)).toBe(335_470)
    })
    it('같은 월급여 300만원이라도 공제대상가족이 1명(74,350원)보다 3명(31,940원)일 때 세액이 더 적음', () => {
        expect(lookupMonthlyWithholdingTax(3_000_000, 1)).toBe(74_350)
        expect(lookupMonthlyWithholdingTax(3_000_000, 3)).toBe(31_940)
    })
    it('간이세액표 최저구간(77만원) 미만 월급여는 세액 0원', () => {
        expect(lookupMonthlyWithholdingTax(500_000, 1)).toBe(0)
    })

    describe('1,000만원 초과 구간 (별표2 원문 산식 — 표 범위 밖이라고 0원을 반환하면 안 됨)', () => {
        it('월급여 1,200만원, 가족 1명 → 별표2 산식(10,000천원 세액 + 초과분×98%×35% + 25,000원) = 2,218,400원', () => {
            // base(1,507,400) + (2,000,000 * 0.98 * 0.35) + 25,000 = 1,507,400 + 686,000 + 25,000
            expect(lookupMonthlyWithholdingTax(12_000_000, 1)).toBe(2_218_400)
        })
        it('월급여가 정확히 1,000만원이면 표 마지막 행이 아니라 산식 적용(초과분 0이어도 25,000원 가산이 원문 그대로 반영됨)', () => {
            // 별표2 원문: "(10,000천원인 경우의 해당 세액) + (초과분×98%×35%) + (25,000원)" — 초과분 0이어도 25,000원은 더해짐(원문에 명시된 계단 현상, 오류 아님)
            expect(lookupMonthlyWithholdingTax(10_000_000, 1)).toBe(1_532_400)
        })
    })
})

describe('localIncomeTax', () => {
    it('지방소득세는 소득세의 10%(반올림이 실제로 작동하는 홀수 케이스)', () => {
        expect(localIncomeTax(35_605)).toBe(3_561)
    })
})

describe('childTaxCredit (별표2 원문 3번 항목 — 8~20세 자녀 세액공제)', () => {
    it('8~20세 자녀가 없으면 공제 0원', () => {
        expect(childTaxCredit(0)).toBe(0)
    })
    it('1명이면 20,830원, 2명이면 45,830원(단순 비례가 아님)', () => {
        expect(childTaxCredit(1)).toBe(20_830)
        expect(childTaxCredit(2)).toBe(45_830)
    })
    it('3명 이상이면 45,830원 + 2명 초과분 1명당 33,330원 — 3명은 79,160원', () => {
        expect(childTaxCredit(3)).toBe(79_160)
    })
})

describe('calcNationalPension', () => {
    it('기준소득월액 상한 미만이면 월급여 × 4.75%(2026년 근로자 부담률)', () => {
        expect(calcNationalPension(2_500_000)).toBe(118_750)
    })
    it('기준소득월액 상한(659만원)을 초과하면 상한액 기준으로 계산됨(월급여가 올라가도 연금 보험료는 고정)', () => {
        const overCap = calcNationalPension(NATIONAL_PENSION_INCOME_CAP_2026H2 + 1_000_000)
        const atCap = calcNationalPension(NATIONAL_PENSION_INCOME_CAP_2026H2)
        expect(overCap).toBe(atCap)
    })
})

describe('calcMonthlyNetPay (연봉 실수령액 탭의 핵심 조합 계산)', () => {
    it('월급여 250만원, 공제대상가족 1명 → 4대보험+소득세+지방소득세 전부 공제 후 실수령액 2,217,905원', () => {
        const result = calcMonthlyNetPay(2_500_000, 1)
        expect(result.nationalPension).toBe(118_750)
        expect(result.healthInsurance).toBe(89_875)
        expect(result.longTermCare).toBe(11_810)
        expect(result.employmentInsurance).toBe(22_500)
        expect(result.incomeTax).toBe(35_600)
        expect(result.localIncomeTax).toBe(3_560)
        expect(result.netPay).toBe(2_217_905)
    })

    it('8~20세 자녀 1명이 있으면 소득세 35,600원에서 20,830원 차감된 14,770원, 지방소득세도 그 10%인 1,477원으로 같이 줄어듦', () => {
        const result = calcMonthlyNetPay(2_500_000, 1, 1)
        expect(result.incomeTax).toBe(14_770)
        expect(result.localIncomeTax).toBe(1_477)
    })

    it('자녀세액공제가 원래 소득세보다 크면 소득세는 0원에서 멈춤(음수로 안 내려감)', () => {
        const result = calcMonthlyNetPay(1_060_000, 1, 3)
        expect(result.incomeTax).toBe(0)
        expect(result.localIncomeTax).toBe(0)
    })
})

describe('calcMonthlyNetPayWithNonTaxable', () => {
    it('총급여 270만원 중 비과세 20만원(식대)이 있으면 과세대상은 250만원으로 계산되어(위 anchor와 동일한 공제액) 실수령액은 그 결과에 비과세분을 더한 2,417,905원', () => {
        const result = calcMonthlyNetPayWithNonTaxable(2_700_000, 200_000, 1)
        expect(result.nationalPension).toBe(118_750)
        expect(result.incomeTax).toBe(35_600)
        expect(result.netPay).toBe(2_417_905)
    })

    it('비과세 소득이 0이면 calcMonthlyNetPay와 결과가 동일(하위호환)', () => {
        expect(calcMonthlyNetPayWithNonTaxable(2_500_000, 0, 1)).toEqual(calcMonthlyNetPay(2_500_000, 1))
    })
})

describe('calcAnnualLeaveDays (연차, 근로기준법 §60)', () => {
    it('입사 6개월차(1년 미만)는 개근 개월수만큼 발생 — 6일', () => {
        expect(calcAnnualLeaveDays(6)).toBe(6)
    })

    it('1년 미만 최대 11일을 넘지 않음(11개월차도 11일)', () => {
        expect(calcAnnualLeaveDays(11)).toBe(11)
    })

    it('근속 1~2년차는 기본 15일', () => {
        expect(calcAnnualLeaveDays(12)).toBe(15)
        expect(calcAnnualLeaveDays(23)).toBe(15)
    })

    it('근속 3년차부터 매 2년마다 1일씩 가산 — 3년차 16일, 5년차 17일', () => {
        expect(calcAnnualLeaveDays(36)).toBe(16)
        expect(calcAnnualLeaveDays(60)).toBe(17)
    })

    it('가산휴가를 포함해 최대 25일을 넘지 않음(21년차 이상)', () => {
        expect(calcAnnualLeaveDays(21 * 12)).toBe(25)
        expect(calcAnnualLeaveDays(40 * 12)).toBe(25)
    })
})

describe('calcWeeklyHolidayPay (주휴수당)', () => {
    it('소정근로시간 주 40시간 / 시급 10,320원 → 하루 8시간분 82,560원', () => {
        expect(calcWeeklyHolidayPay(40, 10_320)).toBe(82_560)
    })

    it('소정근로시간이 40시간을 초과해도 8시간분에서 상한(초과분 반영 안 함)', () => {
        expect(calcWeeklyHolidayPay(52, 10_320)).toBe(82_560)
    })

    it('소정근로시간이 주 20시간(40시간의 절반)이면 지급시간도 절반인 4시간분', () => {
        expect(calcWeeklyHolidayPay(20, 10_320)).toBe(Math.round(4 * 10_320))
    })

    it('소정근로시간이 15시간 미만이면 지급 대상 아님(0원)', () => {
        expect(calcWeeklyHolidayPay(14, 10_320)).toBe(0)
    })
})
