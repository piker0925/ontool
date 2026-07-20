import {describe, expect, it} from 'vitest'
import {amplitudeToDbfs, detectFundamentalFrequency, extractFirstChannel, generateSineWave, peakAmplitude} from './audioTestHelpers'

// 이 헬퍼들은 audioPitch/audioSpeed 테스트(및 이후 오디오 도구 테스트들)의 "독립적인
// 기준값" 역할을 하므로, 헬퍼 자체가 알려진 값에 대해 정확한지 먼저 검증한다.
describe('audioTestHelpers', () => {
    it('detectFundamentalFrequency: 440Hz 순음의 기본 주파수를 오차 1% 이내로 추정', () => {
        const sampleRate = 44100
        const interleaved = generateSineWave(440, 1, sampleRate, 0.5, 2)
        const mono = extractFirstChannel(interleaved, 2)

        const detected = detectFundamentalFrequency(mono, sampleRate)

        expect(detected).toBeGreaterThan(440 * 0.99)
        expect(detected).toBeLessThan(440 * 1.01)
    })

    it('detectFundamentalFrequency: 880Hz도 구분해서 추정', () => {
        const sampleRate = 44100
        const interleaved = generateSineWave(880, 1, sampleRate, 0.5, 2)
        const mono = extractFirstChannel(interleaved, 2)

        const detected = detectFundamentalFrequency(mono, sampleRate)

        expect(detected).toBeGreaterThan(880 * 0.99)
        expect(detected).toBeLessThan(880 * 1.01)
    })

    it('peakAmplitude: 진폭 0.5 sine의 피크는 약 0.5', () => {
        const interleaved = generateSineWave(440, 0.1, 44100, 0.5, 2)
        expect(peakAmplitude(interleaved)).toBeGreaterThan(0.49)
        expect(peakAmplitude(interleaved)).toBeLessThanOrEqual(0.5)
    })

    it('amplitudeToDbfs: 진폭 1.0은 0dBFS, 0.5는 약 -6dBFS', () => {
        expect(amplitudeToDbfs(1.0)).toBeCloseTo(0, 5)
        expect(amplitudeToDbfs(0.5)).toBeCloseTo(-6.0206, 3)
    })
})
