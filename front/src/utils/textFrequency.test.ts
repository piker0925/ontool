import {describe, expect, it} from 'vitest'
import {computeWordFrequency} from './textFrequency'

describe('computeWordFrequency', () => {
    it('특정 단어가 5번 등장하면 빈도 수가 정확히 5로 집계된다', () => {
        const text = '사과 바나나 사과 포도 사과 딸기 사과 수박 사과'
        const result = computeWordFrequency(text)
        const apple = result.find(w => w.word === '사과')
        expect(apple?.count).toBe(5)
    })

    it('조사가 붙은 변형(사과가, 사과를, 사과는)도 사과로 합산된다', () => {
        const text = '사과가 좋다 사과를 먹었다 사과는 맛있다 사과 사과'
        const result = computeWordFrequency(text)
        const apple = result.find(w => w.word === '사과')
        expect(apple?.count).toBe(5)
    })

    it('흔한 불용어("그리고" 등)는 상위 목록에서 걸러지지만, 불용어가 아닌 단어는 그대로 남는다', () => {
        const text = '그리고 그리고 그리고 그리고 그리고 그리고 사과 바나나 포도'
        const result = computeWordFrequency(text)
        expect(result.find(w => w.word === '그리고')).toBeUndefined()
        expect(result.find(w => w.word === '사과')?.count).toBe(1)
        expect(result.find(w => w.word === '바나나')?.count).toBe(1)
    })

    it('조사와 우연히 겹치는 흔한 명사 어미는 잘못 잘리지 않는다 (예: "바나나"의 "나")', () => {
        const text = '바나나 바나나 바나나'
        const result = computeWordFrequency(text)
        expect(result.find(w => w.word === '바나나')?.count).toBe(3)
        expect(result.find(w => w.word === '바나')).toBeUndefined()
    })

    it('빈도 내림차순으로 정렬된다', () => {
        const text = '사과 사과 사과 바나나 바나나 포도'
        const result = computeWordFrequency(text)
        for (let i = 1; i < result.length; i++) {
            expect(result[i].count).toBeLessThanOrEqual(result[i - 1].count)
        }
    })
})
