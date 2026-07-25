import {describe, expect, it} from 'vitest'
import {calcNameCompatScore, getBloodTypeCompat} from './bloodTypeCompatCalc'

describe('getBloodTypeCompat', () => {
    it('O형이 A형을 볼 때는 속설표 최고점 90점', () => {
        expect(getBloodTypeCompat('O', 'A')).toEqual({score: 90, message: '속설 최고 궁합 — 서로를 잘 챙겨줌'})
    })

    it('방향이 바뀌면(A형이 O형을 볼 때) 점수가 다름 — 속설표가 대칭이 아님을 확인', () => {
        const oToA = getBloodTypeCompat('O', 'A')
        const aToO = getBloodTypeCompat('A', 'O')
        expect(aToO.score).not.toBe(oToA.score)
        expect(aToO).toEqual({score: 85, message: 'A형이 O형에게 잘 맞춰주는 편'})
    })

    it('16개 조합 전부 0~100 범위의 점수를 가짐', () => {
        const types = ['A', 'B', 'O', 'AB'] as const
        for (const mine of types) {
            for (const partner of types) {
                const {score} = getBloodTypeCompat(mine, partner)
                expect(score).toBeGreaterThanOrEqual(0)
                expect(score).toBeLessThanOrEqual(100)
            }
        }
    })
})

describe('calcNameCompatScore', () => {
    it('같은 이름 쌍을 넣으면 항상 같은 점수(결정론적)', () => {
        const first = calcNameCompatScore('홍길동', '김철수')
        const second = calcNameCompatScore('홍길동', '김철수')
        expect(first).toBe(second)
    })

    it('이름이 다르면 점수도 달라짐(적어도 이 두 쌍에서는)', () => {
        expect(calcNameCompatScore('홍길동', '김철수')).not.toBe(calcNameCompatScore('이영희', '박민수'))
    })

    it('점수는 항상 0~99 범위(모듈로 100)', () => {
        for (const [a, b] of [['가', '나'], ['홍길동', '김철수'], ['a', 'b']] as const) {
            const score = calcNameCompatScore(a, b)
            expect(score).toBeGreaterThanOrEqual(0)
            expect(score).toBeLessThan(100)
        }
    })
})
