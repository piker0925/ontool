import {BALANCE_QUESTIONS, type BalanceQuestion} from '../data/balanceQuestions'

export type {BalanceQuestion}

/**
 * 밸런스 게임 질문 뱅크에서 무작위로 하나를 뽑는다.
 * excludeIndex를 지정하면(직전 질문의 인덱스) 같은 질문이 연속으로 나오지 않도록 다음 인덱스로 넘긴다.
 */
export function pickRandomBalanceQuestion(excludeIndex?: number): { index: number; question: BalanceQuestion } {
    if (BALANCE_QUESTIONS.length === 0) throw new Error('질문 뱅크가 비어 있습니다.')

    let index = Math.floor(Math.random() * BALANCE_QUESTIONS.length)
    if (BALANCE_QUESTIONS.length > 1 && index === excludeIndex) {
        index = (index + 1) % BALANCE_QUESTIONS.length
    }
    return {index, question: BALANCE_QUESTIONS[index]}
}
