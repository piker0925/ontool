import {describe, expect, it} from 'vitest'
import {ICEBREAKER_QUESTIONS} from '../data/icebreakerQuestions'
import {pickRandomIcebreakerQuestion} from './icebreakerQuestions'

describe('ICEBREAKER_QUESTIONS', () => {
    it('반복 체감을 줄이기 위해 최소 30문항 이상 보유한다', () => {
        expect(ICEBREAKER_QUESTIONS.length).toBeGreaterThanOrEqual(30)
    })

    it('모든 문항이 비어있지 않다', () => {
        for (const q of ICEBREAKER_QUESTIONS) {
            expect(q.trim().length).toBeGreaterThan(0)
        }
    })
})

describe('pickRandomIcebreakerQuestion', () => {
    it('유효한 범위의 인덱스와 그에 해당하는 질문을 반환한다', () => {
        for (let trial = 0; trial < 30; trial++) {
            const {index, question} = pickRandomIcebreakerQuestion()
            expect(index).toBeGreaterThanOrEqual(0)
            expect(index).toBeLessThan(ICEBREAKER_QUESTIONS.length)
            expect(question).toBe(ICEBREAKER_QUESTIONS[index])
        }
    })

    it('excludeIndex를 지정하면 같은 인덱스를 연속으로 반환하지 않는다', () => {
        for (let trial = 0; trial < 50; trial++) {
            const prevIndex = trial % ICEBREAKER_QUESTIONS.length
            const {index} = pickRandomIcebreakerQuestion(prevIndex)
            expect(index).not.toBe(prevIndex)
        }
    })

    it('여러 번 뽑으면 매번 같은 질문만 나오지는 않는다 (고정 편향 없음)', () => {
        const seen = new Set<number>()
        for (let trial = 0; trial < 50; trial++) {
            seen.add(pickRandomIcebreakerQuestion().index)
        }
        expect(seen.size).toBeGreaterThan(1)
    })
})
