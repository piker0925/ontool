import {describe, expect, it} from 'vitest'
import {shiftPitch} from './audioPitch'
import type {PcmAudio} from './audioTypes'
import {detectFundamentalFrequency, extractFirstChannel, generateSineWave} from '../test/audioTestHelpers'

describe('shiftPitch', () => {
    it('+3반음 적용 시 기본 주파수가 원본의 약 2^(3/12)(≈1.19)배가 되고, 길이는 원본과 동일하다', () => {
        const sampleRate = 44100
        const originalFreq = 440
        const original: PcmAudio = {interleaved: generateSineWave(originalFreq, 1, sampleRate, 0.5, 2), sampleRate, channels: 2}

        const shifted = shiftPitch(original, 3)

        const expectedRatio = Math.pow(2, 3 / 12)
        const shiftedFreq = detectFundamentalFrequency(extractFirstChannel(shifted.interleaved, 2), sampleRate)
        const actualRatio = shiftedFreq / originalFreq

        expect(actualRatio).toBeGreaterThan(expectedRatio * 0.95)
        expect(actualRatio).toBeLessThan(expectedRatio * 1.05)

        // 배속(길이)은 원본과 동일하게 유지되어야 한다
        const originalFrames = original.interleaved.length / original.channels
        const shiftedFrames = shifted.interleaved.length / shifted.channels
        expect(shiftedFrames).toBeCloseTo(originalFrames, -2) // 소수 -2자리 = 100프레임 이내 오차 허용
    })

    it('-3반음 적용 시 기본 주파수가 원본보다 낮아진다(양방향 검증 — 한쪽만 동작하지 않는지 확인)', () => {
        const sampleRate = 44100
        const originalFreq = 440
        const original: PcmAudio = {interleaved: generateSineWave(originalFreq, 1, sampleRate, 0.5, 2), sampleRate, channels: 2}

        const shifted = shiftPitch(original, -3)

        const shiftedFreq = detectFundamentalFrequency(extractFirstChannel(shifted.interleaved, 2), sampleRate)
        const expectedRatio = Math.pow(2, -3 / 12)
        const actualRatio = shiftedFreq / originalFreq

        expect(shiftedFreq).toBeLessThan(originalFreq)
        expect(actualRatio).toBeGreaterThan(expectedRatio * 0.95)
        expect(actualRatio).toBeLessThan(expectedRatio * 1.05)
    })

    it('0반음이면 원본과 사실상 동일한 주파수를 유지한다', () => {
        const sampleRate = 44100
        const originalFreq = 440
        const original: PcmAudio = {interleaved: generateSineWave(originalFreq, 1, sampleRate, 0.5, 2), sampleRate, channels: 2}

        const shifted = shiftPitch(original, 0)

        const shiftedFreq = detectFundamentalFrequency(extractFirstChannel(shifted.interleaved, 2), sampleRate)
        expect(shiftedFreq).toBeGreaterThan(originalFreq * 0.98)
        expect(shiftedFreq).toBeLessThan(originalFreq * 1.02)
    })

    it('모노 오디오의 채널 수를 그대로 보존한다', () => {
        const sampleRate = 44100
        const original: PcmAudio = {interleaved: generateSineWave(440, 0.5, sampleRate, 0.5, 1), sampleRate, channels: 1}

        const shifted = shiftPitch(original, 5)

        expect(shifted.channels).toBe(1)
    })
})
