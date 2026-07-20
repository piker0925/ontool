import {describe, expect, it} from 'vitest'
import {trim} from './audioTrim'
import type {PcmAudio} from './audioTypes'
import {generateSineWave} from '../test/audioTestHelpers'

describe('trim', () => {
    it('10초 오디오에서 3~7초를 자르면 정확히 4초(sampleRate*4 샘플)가 된다', () => {
        const sampleRate = 44100
        const audio: PcmAudio = {interleaved: generateSineWave(440, 10, sampleRate, 0.5, 2), sampleRate, channels: 2}

        const result = trim(audio, 3, 7)

        const resultFrames = result.interleaved.length / result.channels
        expect(resultFrames).toBe(sampleRate * 4)
    })

    it('잘라낸 구간이 원본의 해당 구간과 정확히 일치한다(동어반복 방지 — 값 자체를 비교)', () => {
        const sampleRate = 1000 // 값 비교가 쉽도록 작은 샘플레이트 사용
        const audio: PcmAudio = {interleaved: generateSineWave(10, 2, sampleRate, 0.5, 1), sampleRate, channels: 1}

        const result = trim(audio, 0.5, 1.0)

        const expectedSlice = audio.interleaved.slice(sampleRate * 0.5, sampleRate * 1.0)
        expect(Array.from(result.interleaved)).toEqual(Array.from(expectedSlice))
    })

    it('시작이 0초, 끝이 오디오 길이 전체면 원본과 동일한 길이를 반환한다', () => {
        const sampleRate = 44100
        const audio: PcmAudio = {interleaved: generateSineWave(440, 2, sampleRate, 0.5, 2), sampleRate, channels: 2}

        const result = trim(audio, 0, 2)

        expect(result.interleaved.length / result.channels).toBe(sampleRate * 2)
    })

    it('sampleRate와 channels를 보존한다', () => {
        const audio: PcmAudio = {interleaved: generateSineWave(440, 5, 22050, 0.5, 1), sampleRate: 22050, channels: 1}

        const result = trim(audio, 1, 3)

        expect(result.sampleRate).toBe(22050)
        expect(result.channels).toBe(1)
    })
})
