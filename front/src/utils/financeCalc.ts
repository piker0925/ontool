export interface LoanScheduleRow {
    term: number
    payment: number
    principalPortion: number
    interestPortion: number
    balance: number
}

/** 원리금균등상환: 매회 상환액(원금+이자)이 동일하다. 연이자율은 %, 잔액은 반올림 없이 내부 추적하다 표시 시점에만 반올림한다. */
export function equalPaymentSchedule(principal: number, annualRatePercent: number, months: number): LoanScheduleRow[] {
    const r = annualRatePercent / 100 / 12
    const payment = r === 0 ? principal / months : principal * r * (1 + r) ** months / ((1 + r) ** months - 1)
    const rows: LoanScheduleRow[] = []
    let balance = principal
    for (let term = 1; term <= months; term++) {
        const interestPortion = balance * r
        const principalPortion = payment - interestPortion
        balance -= principalPortion
        rows.push({
            term,
            payment: Math.round(payment),
            principalPortion: Math.round(principalPortion),
            interestPortion: Math.round(interestPortion),
            balance: Math.round(Math.abs(balance) < 1e-6 ? 0 : balance),
        })
    }
    return rows
}

/** 원금균등상환: 매회 원금 상환액이 동일하고, 이자는 남은 잔액에 비례해 줄어든다. */
export function equalPrincipalSchedule(principal: number, annualRatePercent: number, months: number): LoanScheduleRow[] {
    const r = annualRatePercent / 100 / 12
    const principalPortion = principal / months
    const rows: LoanScheduleRow[] = []
    let balance = principal
    for (let term = 1; term <= months; term++) {
        const interestPortion = balance * r
        balance -= principalPortion
        rows.push({
            term,
            payment: Math.round(principalPortion + interestPortion),
            principalPortion: Math.round(principalPortion),
            interestPortion: Math.round(interestPortion),
            balance: Math.round(Math.abs(balance) < 1e-6 ? 0 : balance),
        })
    }
    return rows
}

export interface MaturityResult {
    principalTotal: number
    interest: number
    maturityAmount: number
}

/** 예금(거치식) 단리 만기 계산. */
export function depositMaturity(principal: number, annualRatePercent: number, months: number): MaturityResult {
    const interest = principal * (annualRatePercent / 100) * (months / 12)
    return {
        principalTotal: principal,
        interest: Math.round(interest),
        maturityAmount: Math.round(principal + interest),
    }
}

/** 적금(적립식) 단리 만기 계산 — 매월 초 납입, 각 회차 납입금이 남은 개월수만큼 이자가 붙는 표준 공식(원금×n(n+1)/2×월이율). */
export function savingsMaturity(monthlyDeposit: number, annualRatePercent: number, months: number): MaturityResult {
    const principalTotal = monthlyDeposit * months
    const interest = monthlyDeposit * (months * (months + 1) / 2) * (annualRatePercent / 100 / 12)
    return {
        principalTotal,
        interest: Math.round(interest),
        maturityAmount: Math.round(principalTotal + interest),
    }
}

/** 전월세 전환 — 보증금 차액을 월세로. 전환율은 사용자가 직접 입력하는 값(%)이다. */
export function depositToMonthlyRent(depositDiff: number, conversionRatePercent: number): number {
    return Math.round(depositDiff * (conversionRatePercent / 100) / 12)
}

/** 전월세 전환 — 월세를 보증금 차액으로(역산). */
export function monthlyRentToDeposit(monthlyRent: number, conversionRatePercent: number): number {
    return Math.round(monthlyRent * 12 / (conversionRatePercent / 100))
}

/** 전월세 전환 — 보증금 차액과 월세로 적용된 전환율(%)을 역산한다. */
export function conversionRateFromDepositAndRent(depositDiff: number, monthlyRent: number): number {
    return monthlyRent * 12 / depositDiff * 100
}

/** 전월세 전환 법정 상한(%) = 한국은행 기준금리 + 대통령령 산정률(주택임대차보호법 시행령 §9). */
export function legalConversionRateCap(baseRatePercent: number, addOnRatePercent: number): number {
    return baseRatePercent + addOnRatePercent
}

const VAT_RATE = 0.1

/** 부가가치세법 §30 — 공급가액 기준 10% 부가세. */
export function supplyToVat(supplyAmount: number): number {
    return Math.round(supplyAmount * VAT_RATE)
}

/** 부가세 포함가에서 공급가액을 역산(포함가 ÷ 1.1). */
export function totalToSupply(totalWithVat: number): number {
    return Math.round(totalWithVat / (1 + VAT_RATE))
}
