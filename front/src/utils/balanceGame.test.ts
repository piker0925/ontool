import {describe, expect, it} from 'vitest'
import {BALANCE_QUESTIONS} from '../data/balanceQuestions'
import {pickRandomBalanceQuestion} from './balanceGame'

describe('BALANCE_QUESTIONS', () => {
    it('반복 체감을 줄이기 위해 최소 30문항 이상 보유한다', () => {
        expect(BALANCE_QUESTIONS.length).toBeGreaterThanOrEqual(30)
    })

    it('모든 문항에 a, b 선택지가 비어있지 않게 채워져 있다', () => {
        for (const q of BALANCE_QUESTIONS) {
            expect(q.a.trim().length).toBeGreaterThan(0)
            expect(q.b.trim().length).toBeGreaterThan(0)
        }
    })
})

describe('pickRandomBalanceQuestion', () => {
    it('유효한 범위의 인덱스와 그에 해당하는 질문을 반환한다', () => {
        for (let trial = 0; trial < 30; trial++) {
            const {index, question} = pickRandomBalanceQuestion()
            expect(index).toBeGreaterThanOrEqual(0)
            expect(index).toBeLessThan(BALANCE_QUESTIONS.length)
            expect(question).toEqual(BALANCE_QUESTIONS[index])
        }
    })

    it('excludeIndex를 지정하면 같은 인덱스를 연속으로 반환하지 않는다', () => {
        for (let trial = 0; trial < 50; trial++) {
            const prevIndex = trial % BALANCE_QUESTIONS.length
            const {index} = pickRandomBalanceQuestion(prevIndex)
            expect(index).not.toBe(prevIndex)
        }
    })

    it('여러 번 뽑으면 매번 같은 질문만 나오지는 않는다 (고정 편향 없음)', () => {
        const seen = new Set<number>()
        for (let trial = 0; trial < 50; trial++) {
            seen.add(pickRandomBalanceQuestion().index)
        }
        expect(seen.size).toBeGreaterThan(1)
    })
})
