import {ICEBREAKER_QUESTIONS} from '../data/icebreakerQuestions'

/**
 * 아이스브레이킹 질문 뱅크에서 무작위로 하나를 뽑는다.
 * excludeIndex를 지정하면(직전 질문의 인덱스) 같은 질문이 연속으로 나오지 않도록 다음 인덱스로 넘긴다.
 */
export function pickRandomIcebreakerQuestion(excludeIndex?: number): { index: number; question: string } {
    if (ICEBREAKER_QUESTIONS.length === 0) throw new Error('질문 뱅크가 비어 있습니다.')

    let index = Math.floor(Math.random() * ICEBREAKER_QUESTIONS.length)
    if (ICEBREAKER_QUESTIONS.length > 1 && index === excludeIndex) {
        index = (index + 1) % ICEBREAKER_QUESTIONS.length
    }
    return {index, question: ICEBREAKER_QUESTIONS[index]}
}
