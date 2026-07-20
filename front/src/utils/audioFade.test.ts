import {describe, expect, it} from 'vitest'
import {applyFadeInOut} from './audioFade'
import type {PcmAudio} from './audioTypes'

// 사인파 대신 일정한 진폭(DC에 가까운 신호)을 쓴다 — 사인파는 영점 교차 지점에서 원본 값이
// 0이 되어 "결과/원본 = 게인" 비교가 불안정해진다(0으로 나누기). 일정한 진폭이면 결과값이
// 곧 적용된 게인 그 자체이므로 검증이 정확해진다.
function makeConstantAudio(amplitude: number, seconds: number, sampleRate: number, channels = 1): PcmAudio {
    const frames = Math.round(seconds * sampleRate)
    const interleaved = new Float32Array(frames * channels).fill(amplitude)
    return {interleaved, sampleRate, channels}
}

describe('applyFadeInOut', () => {
    it('페이드인: 첫 샘플은 거의 0, 중간 지점은 원본 대비 절반, 페이드 구간 이후는 원본과 동일하다', () => {
        const sampleRate = 1000
        const amplitude = 0.8
        const audio = makeConstantAudio(amplitude, 2, sampleRate)
        const fadeInSeconds = 0.5

        const result = applyFadeInOut(audio, fadeInSeconds, 0)

        expect(result.interleaved[0]).toBeCloseTo(0, 5)

        const midFrame = Math.round((fadeInSeconds * sampleRate) / 2)
        expect(result.interleaved[midFrame]).toBeCloseTo(amplitude * 0.5, 1)

        const afterFadeFrame = Math.round(fadeInSeconds * sampleRate) + 50
        expect(result.interleaved[afterFadeFrame]).toBeCloseTo(amplitude, 5)
    })

    it('페이드아웃: 마지막 샘플은 거의 0, 중간 지점은 원본 대비 절반, 페이드 구간 이전은 원본과 동일하다', () => {
        const sampleRate = 1000
        const amplitude = 0.8
        const audio = makeConstantAudio(amplitude, 2, sampleRate)
        const fadeOutSeconds = 0.5
        const totalFrames = audio.interleaved.length

        const result = applyFadeInOut(audio, 0, fadeOutSeconds)

        expect(result.interleaved[totalFrames - 1]).toBeCloseTo(0, 5)

        const fadeOutFrames = Math.round(fadeOutSeconds * sampleRate)
        const midFrame = totalFrames - 1 - Math.round(fadeOutFrames / 2)
        expect(result.interleaved[midFrame]).toBeCloseTo(amplitude * 0.5, 1)

        const beforeFadeFrame = totalFrames - fadeOutFrames - 50
        expect(result.interleaved[beforeFadeFrame]).toBeCloseTo(amplitude, 5)
    })

    it('모든 채널에 동일한 프레임 단위 게인을 적용한다', () => {
        const sampleRate = 1000
        const audio = makeConstantAudio(0.6, 1, sampleRate, 2)

        const result = applyFadeInOut(audio, 0.2, 0)

        // 프레임 0(양쪽 채널 모두)은 게인 0에 가까워야 한다.
        expect(result.interleaved[0]).toBeCloseTo(0, 5)
        expect(result.interleaved[1]).toBeCloseTo(0, 5)
    })

    it('sampleRate와 channels를 보존하고 길이를 바꾸지 않는다', () => {
        const audio = makeConstantAudio(0.5, 1, 22050, 2)

        const result = applyFadeInOut(audio, 0.05, 0.05)

        expect(result.sampleRate).toBe(22050)
        expect(result.channels).toBe(2)
        expect(result.interleaved.length).toBe(audio.interleaved.length)
    })

    it('아주 짧은 클립에서는 페이드 길이가 전체 길이의 절반으로 클램프되어 겹치지 않는다', () => {
        const sampleRate = 1000
        const amplitude = 0.8
        const audio = makeConstantAudio(amplitude, 0.1, sampleRate) // 100프레임, 절반=50프레임

        // 요청한 페이드 길이(1초)가 클립 전체보다 훨씬 길어도 클램프되어야 한다.
        const result = applyFadeInOut(audio, 1, 1)

        expect(result.interleaved.length).toBe(audio.interleaved.length)
        expect(result.interleaved[0]).toBeCloseTo(0, 5)
        expect(result.interleaved[result.interleaved.length - 1]).toBeCloseTo(0, 5)

        // NaN/Infinity 없이 모든 샘플이 유효한 범위 안에 있어야 한다(겹침으로 인한 이상값 방지).
        for (const v of result.interleaved) {
            expect(Number.isFinite(v)).toBe(true)
            expect(Math.abs(v)).toBeLessThanOrEqual(amplitude + 1e-6)
        }
    })

    it('총 프레임 수가 홀수라 절반 길이가 반올림되어도 fade-in/fade-out이 겹쳐 이중 감쇠되지 않는다', () => {
        const sampleRate = 1000
        const amplitude = 1
        // 45프레임(홀수) — 절반(22.5프레임)을 각각 반올림하면 23+23=46 > 45가 되어
        // 경계 프레임이 두 번 감쇠될 수 있는 조건을 의도적으로 만든다.
        const audio = makeConstantAudio(amplitude, 45 / sampleRate, sampleRate)
        expect(audio.interleaved.length).toBe(45)

        const result = applyFadeInOut(audio, 1, 1) // 절반으로 클램프되도록 충분히 큰 값 요청

        // 겹침이 있었다면 경계 프레임의 게인이 (22/23)^2 ≈ 0.915로, 겹치지 않을 때의
        // 정상 게인(더 크거나 같아야 함)보다 작게 나온다.
        const boundaryFrame = 22
        const singleRampGain = boundaryFrame / 23
        expect(result.interleaved[boundaryFrame]).toBeGreaterThanOrEqual(singleRampGain * amplitude - 1e-6)
    })
})
