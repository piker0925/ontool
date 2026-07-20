const MS_PER_DAY = 86_400_000

function toUtcMidnight(dateStr: string): number {
    const [year, month, day] = dateStr.split('-').map(Number)
    return Date.UTC(year, month - 1, day)
}

export function daysBetween(fromDateStr: string, toDateStr: string): number {
    return Math.round((toUtcMidnight(toDateStr) - toUtcMidnight(fromDateStr)) / MS_PER_DAY)
}

export function formatDday(daysUntilTarget: number): string {
    if (daysUntilTarget === 0) return 'D-DAY'
    return daysUntilTarget > 0 ? `D-${daysUntilTarget}` : `D+${-daysUntilTarget}`
}

export function calcInternationalAge(birthDateStr: string, baseDateStr: string): number {
    const [birthYear, birthMonth, birthDay] = birthDateStr.split('-').map(Number)
    const [baseYear, baseMonth, baseDay] = baseDateStr.split('-').map(Number)
    const hasHadBirthdayThisYear = baseMonth > birthMonth || (baseMonth === birthMonth && baseDay >= birthDay)
    return baseYear - birthYear - (hasHadBirthdayThisYear ? 0 : 1)
}

export interface BabyAge {
    months: number
    days: number
}

function daysInMonth(year: number, month: number): number {
    return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

// 출생일에 개월 수를 더한 "기준 날짜"를 구한다. 대상 월에 해당 일이 없으면(예: 1/31 + 1개월)
// 그 달의 마지막 날로 맞춘다(clamp) — 그래야 남은 일수가 음수로 내려가지 않는다.
function addMonthsClamped(year: number, month: number, day: number, monthsToAdd: number): string {
    const totalMonthIndex = (month - 1) + monthsToAdd
    const newYear = year + Math.floor(totalMonthIndex / 12)
    const newMonth = ((totalMonthIndex % 12) + 12) % 12 + 1
    const newDay = Math.min(day, daysInMonth(newYear, newMonth))
    return `${newYear}-${String(newMonth).padStart(2, '0')}-${String(newDay).padStart(2, '0')}`
}

export function calcBabyAge(birthDateStr: string, baseDateStr: string): BabyAge {
    const [birthYear, birthMonth, birthDay] = birthDateStr.split('-').map(Number)
    const [baseYear, baseMonth] = baseDateStr.split('-').map(Number)
    let months = (baseYear - birthYear) * 12 + (baseMonth - birthMonth)
    let anchor = addMonthsClamped(birthYear, birthMonth, birthDay, months)
    if (daysBetween(anchor, baseDateStr) < 0) {
        months -= 1
        anchor = addMonthsClamped(birthYear, birthMonth, birthDay, months)
    }
    return {months, days: daysBetween(anchor, baseDateStr)}
}

function addDays(dateStr: string, days: number): string {
    return new Date(toUtcMidnight(dateStr) + days * MS_PER_DAY).toISOString().slice(0, 10)
}

const GESTATION_DAYS = 280

export function calcDueDate(lastMenstrualPeriodStr: string): string {
    return addDays(lastMenstrualPeriodStr, GESTATION_DAYS)
}

export interface GestationalAge {
    weeks: number
    days: number
}

export function calcGestationalWeeks(lastMenstrualPeriodStr: string, baseDateStr: string): GestationalAge {
    const elapsedDays = daysBetween(lastMenstrualPeriodStr, baseDateStr)
    return {weeks: Math.floor(elapsedDays / 7), days: elapsedDays % 7}
}
