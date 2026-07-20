import {describe, expect, it} from 'vitest'
import {generateSecret, isWin, judgeGuess} from './numberBaseball'

describe('generateSecret', () => {
    it('중복 없는 길이 N의 숫자 배열을 만든다', () => {
        const secret = generateSecret(3, () => 0.5)
        expect(secret.length).toBe(3)
        expect(new Set(secret).size).toBe(3)
        secret.forEach(d => {
            expect(d).toBeGreaterThanOrEqual(0)
            expect(d).toBeLessThanOrEqual(9)
        })
    })

    it('첫 자리는 0이 아니다', () => {
        const secret = generateSecret(3, () => 0)
        expect(secret[0]).not.toBe(0)
    })
})

describe('judgeGuess — 스트라이크/볼 판정', () => {
    it('자리와 숫자가 모두 일치하면 스트라이크, 숫자만 일치하면 볼로 구분한다(혼동 금지)', () => {
        // secret [1,2,3], guess [1,3,2]:
        // 인덱스0: 1==1 → 스트라이크
        // 인덱스1: guess=3, secret엔 있지만 자리가 다름 → 볼
        // 인덱스2: guess=2, secret엔 있지만 자리가 다름 → 볼
        const result = judgeGuess([1, 2, 3], [1, 3, 2])
        expect(result.strikes).toBe(1)
        expect(result.balls).toBe(2)
    })

    it('정답과 완전히 같으면 전부 스트라이크, 볼은 0이다', () => {
        const result = judgeGuess([4, 5, 6], [4, 5, 6])
        expect(result.strikes).toBe(3)
        expect(result.balls).toBe(0)
    })

    it('겹치는 숫자가 하나도 없으면 스트라이크·볼 모두 0(아웃)이다', () => {
        const result = judgeGuess([1, 2, 3], [7, 8, 9])
        expect(result.strikes).toBe(0)
        expect(result.balls).toBe(0)
        expect(result.isOut).toBe(true)
    })

    it('숫자는 있지만 전부 볼인 경우(자리 전부 다름)를 정확히 센다', () => {
        // secret [1,2,3], guess [3,1,2] — 전부 자리만 다르고 숫자는 다 있음
        const result = judgeGuess([1, 2, 3], [3, 1, 2])
        expect(result.strikes).toBe(0)
        expect(result.balls).toBe(3)
        expect(result.isOut).toBe(false)
    })
})

describe('isWin', () => {
    it('스트라이크 수가 자리 수와 같으면 승리다', () => {
        expect(isWin({strikes: 3, balls: 0, isOut: false}, 3)).toBe(true)
    })

    it('스트라이크 수가 자리 수보다 적으면 승리가 아니다', () => {
        expect(isWin({strikes: 2, balls: 1, isOut: false}, 3)).toBe(false)
    })
})
