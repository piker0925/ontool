import {describe, expect, it} from 'vitest'
import {clamp} from './clamp'

describe('clamp', () => {
    it('범위 안의 값은 그대로 반환한다', () => {
        expect(clamp(5, 1, 10)).toBe(5)
    })
    it('최솟값보다 작으면 최솟값으로 자른다', () => {
        expect(clamp(-3, 1, 10)).toBe(1)
    })
    it('최댓값보다 크면 최댓값으로 자른다', () => {
        expect(clamp(999, 1, 10)).toBe(10)
    })
    it('정수가 아니면 잘라내고(trunc), NaN이면 최솟값으로 대체한다', () => {
        expect(clamp(5.9, 1, 10)).toBe(5)
        expect(clamp(NaN, 1, 10)).toBe(1)
    })
})
