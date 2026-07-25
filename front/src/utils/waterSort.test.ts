import {describe, expect, it} from 'vitest'
import {canPour, createPuzzle, isSolved, pour, TUBE_CAPACITY, type Tubes} from './waterSort'

describe('createPuzzle', () => {
    it('색상 수만큼 채워진 시험관 + 빈 시험관으로 구성되고, 각 색은 정확히 TUBE_CAPACITY개씩 존재한다', () => {
        const tubes = createPuzzle(3, 2, () => 0.5)
        expect(tubes.length).toBe(3 + 2)
        const emptyCount = tubes.filter(t => t.length === 0).length
        expect(emptyCount).toBe(2)

        const allColors = tubes.flat()
        expect(allColors.length).toBe(3 * TUBE_CAPACITY)
        const counts = new Map<string, number>()
        allColors.forEach(c => counts.set(c, (counts.get(c) ?? 0) + 1))
        expect([...counts.values()].every(n => n === TUBE_CAPACITY)).toBe(true)
    })
})

describe('canPour', () => {
    it('빈 시험관에서는 부을 수 없다', () => {
        const tubes: Tubes = [[], ['a']]
        expect(canPour(tubes, 0, 1)).toBe(false)
    })

    it('대상 시험관이 가득 차 있으면 부을 수 없다', () => {
        const tubes: Tubes = [['a'], ['b', 'b', 'b', 'b']]
        expect(canPour(tubes, 0, 1)).toBe(false)
    })

    it('대상 시험관 맨 위 색이 다르면 부을 수 없다', () => {
        const tubes: Tubes = [['a'], ['b']]
        expect(canPour(tubes, 0, 1)).toBe(false)
    })

    it('대상이 비어있거나 맨 위 색이 같으면 부을 수 있다', () => {
        const tubes: Tubes = [['a'], []]
        expect(canPour(tubes, 0, 1)).toBe(true)
        const tubes2: Tubes = [['a'], ['a']]
        expect(canPour(tubes2, 0, 1)).toBe(true)
    })

    it('자기 자신에게는 부을 수 없다', () => {
        const tubes: Tubes = [['a']]
        expect(canPour(tubes, 0, 0)).toBe(false)
    })
})

describe('pour', () => {
    it('맨 위에서부터 연속된 같은 색 구간 전체가 한 번에 옮겨진다', () => {
        const tubes: Tubes = [['x', 'a', 'a'], []]
        const next = pour(tubes, 0, 1)
        expect(next[0]).toEqual(['x'])
        expect(next[1]).toEqual(['a', 'a'])
    })

    it('대상 시험관의 남은 공간만큼만 옮겨지고 나머지는 원래 시험관에 남는다', () => {
        // 원본은 'a'가 3칸 연속(맨 위)이지만, 대상은 맨 위가 'a'라도 이미 3칸 차 있어 1칸만 빈다 —
        // 색은 같아 부을 수는 있지만(top이 일치) 공간 제약으로 1개만 옮겨져야 한다.
        const tubes: Tubes = [['a', 'a', 'a'], ['b', 'a', 'a']]
        const next = pour(tubes, 0, 1)
        expect(next[1]).toEqual(['b', 'a', 'a', 'a'])
        expect(next[0]).toEqual(['a', 'a'])
    })

    it('불가능한 이동은 아무 일도 일어나지 않는다(같은 참조 반환)', () => {
        const tubes: Tubes = [['a'], ['b']]
        const next = pour(tubes, 0, 1)
        expect(next).toBe(tubes)
    })

    it('색이 섞여 있어도 맨 위 연속 구간만 옮겨진다(아래 다른 색은 남는다)', () => {
        const tubes: Tubes = [['b', 'a', 'a'], []]
        const next = pour(tubes, 0, 1)
        expect(next[0]).toEqual(['b']) // 아래에 있던 'b'는 옮겨지지 않음
        expect(next[1]).toEqual(['a', 'a'])
    })
})

describe('isSolved', () => {
    it('모든 시험관이 비어있거나 단색으로 가득 차 있으면 승리다', () => {
        const tubes: Tubes = [['a', 'a', 'a', 'a'], ['b', 'b', 'b', 'b'], []]
        expect(isSolved(tubes)).toBe(true)
    })

    it('색이 섞인 시험관이 하나라도 있으면 아직 승리가 아니다', () => {
        const tubes: Tubes = [['a', 'a', 'a', 'b'], []]
        expect(isSolved(tubes)).toBe(false)
    })

    it('가득 차지 않은 단색 시험관이 있으면(아직 병합 전) 승리가 아니다', () => {
        const tubes: Tubes = [['a', 'a'], ['a', 'a'], []]
        expect(isSolved(tubes)).toBe(false)
    })
})
