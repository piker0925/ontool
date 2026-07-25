import {describe, expect, it} from 'vitest'
import {generateRandomOrder} from './orderPicker'

describe('generateRandomOrder', () => {
    it('참가자 수가 그대로 유지된다', () => {
        const names = ['철수', '영희', '민수', '지훈']
        expect(generateRandomOrder(names)).toHaveLength(names.length)
    })

    it('결과는 입력과 같은 원소의 순열이다 (누락·중복 없음)', () => {
        const names = ['철수', '영희', '민수', '지훈', '수아']
        const order = generateRandomOrder(names)
        expect(new Set(order)).toEqual(new Set(names))
    })

    it('원본 배열을 변형하지 않는다', () => {
        const names = ['철수', '영희', '민수']
        const original = [...names]
        generateRandomOrder(names)
        expect(names).toEqual(original)
    })

    it('빈 배열을 넣으면 빈 배열을 반환한다', () => {
        expect(generateRandomOrder([])).toEqual([])
    })

    it('여러 번 뽑으면 매번 같은 순서만 나오지는 않는다 (고정 편향 없음)', () => {
        const names = ['철수', '영희', '민수', '지훈', '수아', '예린']
        const orders = new Set<string>()
        for (let trial = 0; trial < 50; trial++) {
            orders.add(generateRandomOrder(names).join(','))
        }
        expect(orders.size).toBeGreaterThan(1)
    })
})
