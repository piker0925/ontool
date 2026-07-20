import {describe, expect, it} from 'vitest'
import {generateLottoNumbers} from './lotto'

describe('generateLottoNumbers', () => {
    it('6개의 번호를 생성한다', () => {
        expect(generateLottoNumbers()).toHaveLength(6)
    })

    it('모든 번호가 1~45 범위 내에 있고 중복이 없다 (여러 번 생성해도 매번 검증)', () => {
        for (let trial = 0; trial < 50; trial++) {
            const numbers = generateLottoNumbers()
            expect(numbers).toHaveLength(6)
            for (const n of numbers) {
                expect(n).toBeGreaterThanOrEqual(1)
                expect(n).toBeLessThanOrEqual(45)
            }
            expect(new Set(numbers).size).toBe(6)
        }
    })
})
