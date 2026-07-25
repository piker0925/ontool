import {describe, expect, it} from 'vitest'
import {computeSpinRotationDeg, pickRouletteWinner} from './roulettePicker'

describe('pickRouletteWinner', () => {
    it('항목이 없으면 에러를 던진다', () => {
        expect(() => pickRouletteWinner([])).toThrow()
    })

    it('유효한 범위 안의 인덱스를 반환한다', () => {
        for (let trial = 0; trial < 30; trial++) {
            const winner = pickRouletteWinner(['짜장면', '짬뽕', '탕수육', '볶음밥'])
            expect(winner).toBeGreaterThanOrEqual(0)
            expect(winner).toBeLessThan(4)
        }
    })

    it('같은 입력이라도 여러 번 뽑으면 매번 같은 결과만 나오지는 않는다 (고정 편향 없음)', () => {
        const items = ['짜장면', '짬뽕', '탕수육', '볶음밥']
        const results = new Set<number>()
        for (let trial = 0; trial < 100; trial++) {
            results.add(pickRouletteWinner(items))
        }
        expect(results.size).toBeGreaterThan(1)
    })

    it('항목이 1개면 항상 그 항목(인덱스 0)을 반환한다', () => {
        expect(pickRouletteWinner(['혼자'])).toBe(0)
    })
})

describe('computeSpinRotationDeg', () => {
    it('당첨 슬라이스의 중심이 포인터(0deg, 12시 방향) 밑에 오도록 회전각을 계산한다', () => {
        // 4등분(항목 4개)일 때 슬라이스는 0deg에서 시작해 시계방향으로 90deg씩.
        // winnerIndex=0 슬라이스 중심은 45deg 지점 -> 그 지점이 포인터(0deg)에 오려면
        // 휠을 -45deg만큼(반시계) 돌려야 하므로, 360도 보정 후 최소 회전각은 315deg.
        const deg = computeSpinRotationDeg(0, 4, 0)
        expect(deg % 360).toBeCloseTo(315, 5)
    })

    it('extraSpins 만큼 완전한 360도 회전이 추가된다', () => {
        const zero = computeSpinRotationDeg(1, 4, 0)
        const withSpins = computeSpinRotationDeg(1, 4, 5)
        expect(withSpins - zero).toBeCloseTo(5 * 360, 5)
    })

    it('같은 인덱스·항목 수에 대해 항상 같은 결과(결정론적)를 반환한다', () => {
        expect(computeSpinRotationDeg(2, 6, 3)).toBe(computeSpinRotationDeg(2, 6, 3))
    })
})
