import {describe, expect, it} from 'vitest'
import {convertUnit} from './unitConvert'

describe('convertUnit — 길이', () => {
    it('1 in = 2.54 cm (독립적으로 알려진 환산값)', () => {
        expect(convertUnit('length', 1, 'in', 'cm')).toBeCloseTo(2.54, 10)
    })
    it('역산하면 원래 값으로 돌아옴(왕복 변환) — 중간값은 원값과 다름', () => {
        const converted = convertUnit('length', 1, 'in', 'cm')
        expect(converted).not.toBeCloseTo(1, 5)
        expect(convertUnit('length', converted, 'cm', 'in')).toBeCloseTo(1, 10)
    })
})

describe('convertUnit — 무게', () => {
    it('1 lb = 453.59237 g (독립적으로 알려진 환산값)', () => {
        expect(convertUnit('weight', 1, 'lb', 'g')).toBeCloseTo(453.59237, 5)
    })
    it('역산하면 원래 값으로 돌아옴(왕복 변환) — 중간값은 원값과 다름', () => {
        const converted = convertUnit('weight', 1, 'lb', 'g')
        expect(converted).not.toBeCloseTo(1, 5)
        expect(convertUnit('weight', converted, 'g', 'lb')).toBeCloseTo(1, 10)
    })
})

describe('convertUnit — 부피', () => {
    it('1 gal(US) = 3.785411784 L (독립적으로 알려진 환산값)', () => {
        expect(convertUnit('volume', 1, 'gal', 'L')).toBeCloseTo(3.785411784, 9)
    })
    it('역산하면 원래 값으로 돌아옴(왕복 변환) — 중간값은 원값과 다름', () => {
        const converted = convertUnit('volume', 1, 'gal', 'L')
        expect(converted).not.toBeCloseTo(1, 5)
        expect(convertUnit('volume', converted, 'L', 'gal')).toBeCloseTo(1, 10)
    })
})
