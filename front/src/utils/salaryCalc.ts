import {
    EMPLOYMENT_INSURANCE_EMPLOYEE_RATE,
    HEALTH_INSURANCE_EMPLOYEE_RATE,
    LONG_TERM_CARE_RATE_OF_HEALTH_INSURANCE,
    MINIMUM_WAGE_2026_HOURLY,
    NATIONAL_PENSION_EMPLOYEE_RATE,
    NATIONAL_PENSION_INCOME_CAP_2026H2,
    NATIONAL_PENSION_INCOME_FLOOR_2026H2,
} from './salaryRates2026'
import {CHILD_TAX_CREDIT, WITHHOLDING_TAX_OVER_10M, WITHHOLDING_TAX_TABLE_2026} from './withholdingTaxTable2026'

export function hourlyToMonthly(hourlyWage: number, monthlyHours: number = 209): number {
    return Math.round(hourlyWage * monthlyHours)
}

export function monthlyToHourly(monthlySalary: number, monthlyHours: number = 209): number {
    return Math.round(monthlySalary / monthlyHours)
}

export function monthlyToAnnual(monthlySalary: number): number {
    return monthlySalary * 12
}

export function annualToMonthly(annualSalary: number): number {
    return Math.round(annualSalary / 12)
}

export function isBelowMinimumWage2026(hourlyWage: number): boolean {
    return hourlyWage < MINIMUM_WAGE_2026_HOURLY
}

export function weeklyOvertimeHours(weeklyHours: number, standardHours: number = 40): number {
    return Math.max(0, weeklyHours - standardHours)
}

export function overtimePay(hourlyWage: number, weeklyHours: number, standardHours: number = 40, multiplier: number = 1.5): number {
    return Math.round(hourlyWage * weeklyOvertimeHours(weeklyHours, standardHours) * multiplier)
}

const MS_PER_DAY = 1000 * 60 * 60 * 24

/** 입사일을 1일차로 포함하는 재직일수(퇴사일 - 입사일 + 1). 날짜는 'YYYY-MM-DD' 형식. */
export function daysBetweenInclusive(startDateStr: string, endDateStr: string): number {
    const start = new Date(startDateStr)
    const end = new Date(endDateStr)
    return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY) + 1
}

/** 퇴사일 기준 직전 3개월(달력상 3개월 전 같은 날짜부터 퇴사일까지)의 총 일수 — 평균임금 산정기간. */
export function threeMonthPeriodDays(endDateStr: string): number {
    const end = new Date(endDateStr)
    const start = new Date(end)
    start.setMonth(start.getMonth() - 3)
    return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY)
}

/**
 * 근로기준법 §2 평균임금. 상여금·연차수당은 산정사유 발생일 이전 12개월 지급총액의 3/12을 가산한다(안분).
 * 통상임금과의 최저한도 비교(근로기준법 §2③)는 포함하지 않음 — 참고용 단순 모델.
 */
export function calcAverageDailyWage(
    threeMonthTotalWage: number,
    threeMonthTotalDays: number,
    annualBonus: number = 0,
    annualLeaveAllowance: number = 0,
): number {
    const proratedBonus = annualBonus * (3 / 12)
    const proratedLeaveAllowance = annualLeaveAllowance * (3 / 12)
    return Math.round((threeMonthTotalWage + proratedBonus + proratedLeaveAllowance) / threeMonthTotalDays)
}

/** 근로기준법 퇴직금 산정 공식: 1일 평균임금 × 30일 × (재직일수 / 365) */
export function calcSeverancePay(averageDailyWage: number, tenureDays: number): number {
    return Math.round(averageDailyWage * 30 * (tenureDays / 365))
}

/**
 * 월급여 1,000만원 초과 구간 — 별표2 원문 산식(표가 아닌 계산식). 98% 배율은 원문에 명시된 구간(1~3단계)에만 적용되고
 * 4~6단계는 배율 없이 그대로 초과분에 세율만 곱한다 — 원문 표기 그대로이며 임의로 통일하지 않았음.
 */
function withholdingTaxOver10M(monthlySalary: number, famIndex: number): number {
    const base = WITHHOLDING_TAX_OVER_10M.baseAt10M[famIndex]
    if (monthlySalary <= 14_000_000) {
        return Math.round(base + (monthlySalary - 10_000_000) * 0.98 * 0.35 + 25_000)
    }
    if (monthlySalary <= 28_000_000) {
        return Math.round(base + 1_397_000 + (monthlySalary - 14_000_000) * 0.98 * 0.38)
    }
    if (monthlySalary <= 30_000_000) {
        return Math.round(base + 6_610_600 + (monthlySalary - 28_000_000) * 0.98 * 0.40)
    }
    if (monthlySalary <= 45_000_000) {
        return Math.round(base + 7_394_600 + (monthlySalary - 30_000_000) * 0.40)
    }
    if (monthlySalary <= 87_000_000) {
        return Math.round(base + 13_394_600 + (monthlySalary - 45_000_000) * 0.42)
    }
    return Math.round(base + 31_034_600 + (monthlySalary - 87_000_000) * 0.45)
}

/** 2026년 근로소득 간이세액표 조회. 월급여 77만원 미만은 0원, 1,000만원 이상은 별표2 산식으로 전환. */
export function lookupMonthlyWithholdingTax(monthlySalary: number, dependents: number): number {
    const famIndex = Math.min(Math.max(dependents, 1), 11) - 1
    if (monthlySalary >= 10_000_000) {
        return withholdingTaxOver10M(monthlySalary, famIndex)
    }
    const row = WITHHOLDING_TAX_TABLE_2026.find(r => monthlySalary >= r.from && monthlySalary < r.to)
    if (!row) return 0
    return row.tax[famIndex]
}

export function localIncomeTax(incomeTax: number): number {
    return Math.round(incomeTax * 0.1)
}

/** 별표2 원문 3번 항목 — 8~20세 자녀 세액공제. 공제대상가족수(dependents)와 별개 입력값. */
export function childTaxCredit(childrenAged8to20: number): number {
    if (childrenAged8to20 <= 0) return 0
    if (childrenAged8to20 === 1) return CHILD_TAX_CREDIT.oneChild
    if (childrenAged8to20 === 2) return CHILD_TAX_CREDIT.twoChildren
    return CHILD_TAX_CREDIT.twoChildren + (childrenAged8to20 - 2) * CHILD_TAX_CREDIT.perChildOverTwo
}

/** 국민연금 근로자 부담분. 기준소득월액은 상/하한액으로 클리핑됨(2026-07~2027-06 적용분 기준). */
export function calcNationalPension(monthlySalary: number): number {
    const clipped = Math.min(Math.max(monthlySalary, NATIONAL_PENSION_INCOME_FLOOR_2026H2), NATIONAL_PENSION_INCOME_CAP_2026H2)
    return Math.round(clipped * NATIONAL_PENSION_EMPLOYEE_RATE)
}

export interface MonthlyNetPayBreakdown {
    nationalPension: number
    healthInsurance: number
    longTermCare: number
    employmentInsurance: number
    incomeTax: number
    localIncomeTax: number
    netPay: number
}

/**
 * 비과세 소득(식대·자가운전보조금 등)은 4대보험·소득세 산정 기준(과세대상 급여)에서 제외되지만,
 * 실제로 지급되는 돈이라 실수령액 계산 시엔 그대로 더해진다.
 */
export function calcMonthlyNetPayWithNonTaxable(
    grossMonthlySalary: number,
    nonTaxableMonthlyIncome: number,
    dependents: number,
    childrenAged8to20: number = 0,
): MonthlyNetPayBreakdown {
    const taxableMonthly = Math.max(0, grossMonthlySalary - nonTaxableMonthlyIncome)
    const base = calcMonthlyNetPay(taxableMonthly, dependents, childrenAged8to20)
    return {...base, netPay: base.netPay + nonTaxableMonthlyIncome}
}

export function calcMonthlyNetPay(monthlySalary: number, dependents: number, childrenAged8to20: number = 0): MonthlyNetPayBreakdown {
    const nationalPension = calcNationalPension(monthlySalary)
    const healthInsurance = Math.round(monthlySalary * HEALTH_INSURANCE_EMPLOYEE_RATE)
    const longTermCare = Math.round(healthInsurance * LONG_TERM_CARE_RATE_OF_HEALTH_INSURANCE)
    const employmentInsurance = Math.round(monthlySalary * EMPLOYMENT_INSURANCE_EMPLOYEE_RATE)
    const incomeTax = Math.max(0, lookupMonthlyWithholdingTax(monthlySalary, dependents) - childTaxCredit(childrenAged8to20))
    const localTax = localIncomeTax(incomeTax)
    const totalDeductions = nationalPension + healthInsurance + longTermCare + employmentInsurance + incomeTax + localTax
    return {
        nationalPension,
        healthInsurance,
        longTermCare,
        employmentInsurance,
        incomeTax,
        localIncomeTax: localTax,
        netPay: monthlySalary - totalDeductions,
    }
}

const MAX_ANNUAL_LEAVE_DAYS_UNDER_1YEAR = 11
const BASE_ANNUAL_LEAVE_DAYS = 15
const MAX_ANNUAL_LEAVE_DAYS = 25

/**
 * 근로기준법 §60 연차유급휴가 일수.
 * - 계속근로 1년 미만: 1개월 개근마다 1일씩 발생(최대 11일)
 * - 1년 이상: 15일 + (근속연수-1)/2 를 내림한 만큼 가산, 최대 25일(§60②③)
 */
export function calcAnnualLeaveDays(monthsOfService: number): number {
    if (monthsOfService < 12) {
        return Math.min(Math.floor(monthsOfService), MAX_ANNUAL_LEAVE_DAYS_UNDER_1YEAR)
    }
    const yearsOfService = Math.floor(monthsOfService / 12)
    const bonusDays = Math.floor((yearsOfService - 1) / 2)
    return Math.min(BASE_ANNUAL_LEAVE_DAYS + bonusDays, MAX_ANNUAL_LEAVE_DAYS)
}

const WEEKLY_HOLIDAY_MIN_SCHEDULED_HOURS = 15
const WEEKLY_HOLIDAY_STANDARD_HOURS = 40
const WEEKLY_HOLIDAY_PAID_HOURS = 8

/**
 * 주휴수당 — 1주 소정근로시간이 15시간 이상이고 개근한 경우 지급.
 * 지급시간 = min(소정근로시간, 40시간) / 40 × 8시간, 금액 = 지급시간 × 시급.
 */
export function calcWeeklyHolidayPay(weeklyScheduledHours: number, hourlyWage: number): number {
    if (weeklyScheduledHours < WEEKLY_HOLIDAY_MIN_SCHEDULED_HOURS) return 0
    const paidHours = Math.min(weeklyScheduledHours, WEEKLY_HOLIDAY_STANDARD_HOURS) / WEEKLY_HOLIDAY_STANDARD_HOURS * WEEKLY_HOLIDAY_PAID_HOURS
    return Math.round(paidHours * hourlyWage)
}
