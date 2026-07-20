import {describe, expect, it} from 'vitest'
import {buildTypeScaleCss, computeTypeScale} from './typeScale'

describe('computeTypeScale', () => {
    it('기준값 × 배율^n 공식대로 각 단계 크기를 계산한다 (배율 1.25)', () => {
        const steps = computeTypeScale(16, 1.25, 2, 2)

        expect(steps).toEqual([
            {step: -2, sizePx: 10.24},
            {step: -1, sizePx: 12.8},
            {step: 0, sizePx: 16},
            {step: 1, sizePx: 20},
            {step: 2, sizePx: 25},
        ])
    })

    it('반올림 규칙: 소수점 셋째 자리에서 반올림해 둘째 자리까지 남긴다', () => {
        // 16 * 1.2^1 = 19.2 (정확히 나눠떨어짐), 16 * 1.2^3 = 27.648 → 27.65
        const steps = computeTypeScale(16, 1.2, 0, 3)
        expect(steps.find(s => s.step === 1)?.sizePx).toBe(19.2)
        expect(steps.find(s => s.step === 3)?.sizePx).toBe(27.65)
    })
})

describe('buildTypeScaleCss', () => {
    it('각 단계를 --font-size-{step} 커스텀 프로퍼티로 출력한다', () => {
        const css = buildTypeScaleCss([
            {step: -1, sizePx: 12.8},
            {step: 0, sizePx: 16},
            {step: 1, sizePx: 20},
        ])

        expect(css).toBe([
            '--font-size--1: 12.8px;',
            '--font-size-0: 16px;',
            '--font-size-1: 20px;',
        ].join('\n'))
    })
})
