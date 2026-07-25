// 청약저축 가점제(주택공급에 관한 규칙 별표1) — 값 출처는 docs/data/rate-sources-2026.md.
// 원문 별표1 자체가 law.go.kr에서 JS 렌더링이라 직접 파싱은 못 했고, 다수 2차 출처(부동산·청약 정보
// 사이트) 일치로 확인한 값이다(신뢰도 🟡). 만점 84점(무주택기간 32 + 부양가족수 35 + 가입기간 17)은
// 여러 출처에서 공통적으로 언급되는 값이라 구조 검증에 도움이 된다.

const NO_HOMEOWNERSHIP_MAX_SCORE = 32
const NO_HOMEOWNERSHIP_BASE_SCORE = 2
const NO_HOMEOWNERSHIP_PER_YEAR = 2

/** 무주택기간 점수 — 1년 미만 2점, 이후 1년마다 2점씩 가산, 15년 이상 32점(만점). */
export function calcNoHomeownershipScore(years: number): number {
    if (years < 0) return NO_HOMEOWNERSHIP_BASE_SCORE
    return Math.min(NO_HOMEOWNERSHIP_MAX_SCORE, NO_HOMEOWNERSHIP_BASE_SCORE + Math.floor(years) * NO_HOMEOWNERSHIP_PER_YEAR)
}

const DEPENDENTS_MAX_SCORE = 35
const DEPENDENTS_BASE_SCORE = 5
const DEPENDENTS_PER_PERSON = 5

/** 부양가족수 점수 — 0명 5점, 1명당 5점씩 가산, 6명 이상 35점(만점). */
export function calcDependentsScore(dependents: number): number {
    if (dependents < 0) return DEPENDENTS_BASE_SCORE
    return Math.min(DEPENDENTS_MAX_SCORE, DEPENDENTS_BASE_SCORE + dependents * DEPENDENTS_PER_PERSON)
}

const ACCOUNT_PERIOD_MAX_SCORE = 17

/** 청약통장 가입기간 점수 — 6개월 미만 1점, 6개월~1년 미만 2점, 이후 1년마다 1점씩 가산, 15년 이상 17점(만점). */
export function calcAccountPeriodScore(months: number): number {
    if (months < 6) return 1
    if (months < 12) return 2
    const years = Math.floor(months / 12)
    return Math.min(ACCOUNT_PERIOD_MAX_SCORE, 2 + years)
}

export interface SubscriptionScoreResult {
    noHomeownershipScore: number
    dependentsScore: number
    accountPeriodScore: number
    totalScore: number
}

export function calcSubscriptionScore(noHomeownershipYears: number, dependents: number, accountPeriodMonths: number): SubscriptionScoreResult {
    const noHomeownershipScore = calcNoHomeownershipScore(noHomeownershipYears)
    const dependentsScore = calcDependentsScore(dependents)
    const accountPeriodScore = calcAccountPeriodScore(accountPeriodMonths)
    return {
        noHomeownershipScore,
        dependentsScore,
        accountPeriodScore,
        totalScore: noHomeownershipScore + dependentsScore + accountPeriodScore,
    }
}
