// LTV/DTI/DSR 비율 계산 — 정의(계산식) 자체는 안정적이지만 규제지역별 한도는 정책에 따라 반년
// 새 여러 번 바뀔 만큼 유동적이라(docs/data/rate-sources-2026.md 참고) 하드코딩하지 않는다.
// 이 계산기는 "간단 추정"(사용자가 입력한 값으로 비율만 계산) 스코프이며, 실제 한도는 대출 시점
// 금융기관·정부 공고를 확인해야 한다.

/** LTV(주택담보인정비율, %) = 대출금액 ÷ 담보가치 × 100. */
export function calcLtv(loanAmount: number, collateralValue: number): number {
    if (collateralValue <= 0) return 0
    return (loanAmount / collateralValue) * 100
}

/** DTI(총부채상환비율, %) = (주담대 연원리금상환액 + 기타부채 연이자상환액) ÷ 연소득 × 100. */
export function calcDti(annualHousingLoanRepayment: number, annualOtherDebtInterest: number, annualIncome: number): number {
    if (annualIncome <= 0) return 0
    return ((annualHousingLoanRepayment + annualOtherDebtInterest) / annualIncome) * 100
}

/** DSR(총부채원리금상환비율, %) = 모든 대출의 연원리금상환액 합계 ÷ 연소득 × 100. */
export function calcDsr(totalAnnualDebtRepayment: number, annualIncome: number): number {
    if (annualIncome <= 0) return 0
    return (totalAnnualDebtRepayment / annualIncome) * 100
}
