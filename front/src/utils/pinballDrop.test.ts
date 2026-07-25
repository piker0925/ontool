import {describe, expect, it} from 'vitest'
import {simulatePinballDrop} from './pinballDrop'

describe('simulatePinballDrop', () => {
    it('행 수가 1 미만이면 에러를 던진다', () => {
        expect(() => simulatePinballDrop(0, 1)).toThrow()
    })

    it('같은 시드로 실행하면 경로와 최종 슬롯이 완전히 동일하다 (결정론적 재현)', () => {
        const a = simulatePinballDrop(12, 42)
        const b = simulatePinballDrop(12, 42)
        expect(a).toEqual(b)
    })

    it('시드가 다르면(적어도 일부는) 다른 경로가 나온다', () => {
        const a = simulatePinballDrop(12, 1)
        const b = simulatePinballDrop(12, 2)
        expect(a).not.toEqual(b)
    })

    it('경로 길이는 rows와 같고, 각 스텝은 row 번호가 0부터 순서대로 증가한다', () => {
        const result = simulatePinballDrop(8, 7)
        expect(result.path).toHaveLength(8)
        result.path.forEach((step, i) => {
            expect(step.row).toBe(i)
            expect(['left', 'right']).toContain(step.direction)
        })
    })

    it('finalSlot은 0 이상 rows 이하이며, right로 간 횟수와 정확히 일치한다', () => {
        const result = simulatePinballDrop(10, 99)
        const rightCount = result.path.filter(s => s.direction === 'right').length
        expect(result.finalSlot).toBe(rightCount)
        expect(result.finalSlot).toBeGreaterThanOrEqual(0)
        expect(result.finalSlot).toBeLessThanOrEqual(10)
    })

    it('시드를 지정하지 않으면(매 호출 무작위) 여러 번 굴렸을 때 결과가 한 값에 고정되지 않는다 (고정 편향 없음)', () => {
        const rows = 10
        const finalSlots = new Set<number>()
        for (let trial = 0; trial < 60; trial++) {
            finalSlots.add(simulatePinballDrop(rows).finalSlot)
        }
        expect(finalSlots.size).toBeGreaterThan(1)
    })

    it('시드를 지정하지 않은 두 번의 연속 호출은 매번 같은 경로를 반복하지 않는다', () => {
        const rows = 12
        let sawDifference = false
        let previous = JSON.stringify(simulatePinballDrop(rows).path)
        for (let trial = 0; trial < 20; trial++) {
            const current = JSON.stringify(simulatePinballDrop(rows).path)
            if (current !== previous) {
                sawDifference = true
                break
            }
            previous = current
        }
        expect(sawDifference).toBe(true)
    })
})
