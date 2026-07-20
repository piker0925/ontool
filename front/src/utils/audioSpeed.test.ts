import {describe, expect, it} from 'vitest'
import {changeSpeed} from './audioSpeed'
import type {PcmAudio} from './audioTypes'
import {detectFundamentalFrequency, extractFirstChannel, generateSineWave, peakAmplitude} from '../test/audioTestHelpers'

describe('changeSpeed', () => {
    it('1.5배속 + 피치유지: 길이는 원본의 정확히 1/1.5이고 꼬리에 무음이 섞이지 않으며, 피치는 원본과 동일하게 유지', () => {
        const sampleRate = 44100
        const originalFreq = 440
        const original: PcmAudio = {interleaved: generateSineWave(originalFreq, 2, sampleRate, 0.5, 2), sampleRate, channels: 2}

        const result = changeSpeed(original, 1.5, true)

        const originalFrames = original.interleaved.length / original.channels
        const resultFrames = result.interleaved.length / result.channels
        const expectedFrames = Math.round(originalFrames / 1.5)

        // 정확히 목표 길이여야 한다 — 파이프라인 플러시용 무음 패딩이 잘리지 않고 섞여
        // 들어가면 길이가 이보다 길어지는 회귀(074 리뷰에서 실제로 발견됨)를 잡아낸다.
        expect(resultFrames).toBe(expectedFrames)

        // 결과의 마지막 0.05초가 무음이 아님을 확인 — 트리밍이 무음 꼬리가 아니라 실제
        // 신호를 잘라버렸다면(반대 방향 버그) 여기서 걸린다.
        const tailFrames = Math.round(sampleRate * 0.05)
        const tail = result.interleaved.subarray((resultFrames - tailFrames) * 2)
        expect(peakAmplitude(tail)).toBeGreaterThan(0.3)

        const resultFreq = detectFundamentalFrequency(extractFirstChannel(result.interleaved, 2), sampleRate)
        expect(resultFreq).toBeGreaterThan(originalFreq * 0.95)
        expect(resultFreq).toBeLessThan(originalFreq * 1.05)
    })

    it('0.5배속(느리게) + 피치유지: 길이가 정확히 원본의 2배로 늘어나고 꼬리에 무음이 섞이지 않는다', () => {
        const sampleRate = 44100
        const original: PcmAudio = {interleaved: generateSineWave(440, 1, sampleRate, 0.5, 2), sampleRate, channels: 2}

        const result = changeSpeed(original, 0.5, true)

        const originalFrames = original.interleaved.length / original.channels
        const resultFrames = result.interleaved.length / result.channels
        const expectedFrames = Math.round(originalFrames / 0.5)

        expect(resultFrames).toBe(expectedFrames)

        const tailFrames = Math.round(sampleRate * 0.05)
        const tail = result.interleaved.subarray((resultFrames - tailFrames) * 2)
        expect(peakAmplitude(tail)).toBeGreaterThan(0.3)
    })

    it('피치유지 끄면(자연스러운 배속) 배속이 빨라질수록 피치도 함께 올라간다', () => {
        const sampleRate = 44100
        const originalFreq = 440
        const original: PcmAudio = {interleaved: generateSineWave(originalFreq, 1, sampleRate, 0.5, 2), sampleRate, channels: 2}

        const result = changeSpeed(original, 2, false)

        const resultFrames = result.interleaved.length / result.channels
        const originalFrames = original.interleaved.length / original.channels
        expect(resultFrames).toBeCloseTo(originalFrames / 2, -2)

        const resultFreq = detectFundamentalFrequency(extractFirstChannel(result.interleaved, 2), sampleRate)
        expect(resultFreq).toBeGreaterThan(originalFreq * 1.8) // 2배속이면 피치도 약 2배로 올라감
    })

    it('모노 채널 수를 보존한다', () => {
        const sampleRate = 44100
        const original: PcmAudio = {interleaved: generateSineWave(440, 1, sampleRate, 0.5, 1), sampleRate, channels: 1}

        const result = changeSpeed(original, 1.5, true)

        expect(result.channels).toBe(1)
    })
})
