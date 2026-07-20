import {describe, expect, it} from 'vitest'
import {billingWeight, calcVolumetricWeight} from './parcelVolumeWeight'

describe('calcVolumetricWeight (가로×세로×높이/6000)', () => {
    it('40×30×20cm → 4kg (택배 업계에서 흔히 쓰이는 실측 예시)', () => {
        expect(calcVolumetricWeight(40, 30, 20)).toBeCloseTo(4, 6)
    })
    it('60×50×40cm → 20kg', () => {
        expect(calcVolumetricWeight(60, 50, 40)).toBeCloseTo(20, 6)
    })
})

describe('billingWeight (실중량과 부피무게 중 큰 값)', () => {
    it('실중량이 더 크면 실중량이 청구 기준', () => {
        expect(billingWeight(5, 4)).toBe(5)
    })
    it('부피무게가 더 크면 부피무게가 청구 기준', () => {
        expect(billingWeight(2, 4)).toBe(4)
    })
})
