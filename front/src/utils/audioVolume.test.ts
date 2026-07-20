import {describe, expect, it} from 'vitest'
import {autoNormalize, manualGain} from './audioVolume'
import type {PcmAudio} from './audioTypes'
import {amplitudeToDbfs, generateSineWave, peakAmplitude} from '../test/audioTestHelpers'

describe('autoNormalize', () => {
    it('조용한 오디오(피크 -20dBFS)는 목표(-1dBFS)에 맞춰 증폭된다', () => {
        const sampleRate = 44100
        // 진폭 0.1 ≈ -20dBFS
        const quiet: PcmAudio = {interleaved: generateSineWave(440, 0.5, sampleRate, 0.1, 2), sampleRate, channels: 2}

        const result = autoNormalize(quiet, -1)

        const resultPeakDb = amplitudeToDbfs(peakAmplitude(result.interleaved))
        expect(resultPeakDb).toBeGreaterThan(amplitudeToDbfs(peakAmplitude(quiet.interleaved)))
        expect(resultPeakDb).toBeCloseTo(-1, 0)
    })

    it('큰 오디오(피크 -0.1dBFS)는 목표(-1dBFS)에 맞춰 감쇠된다 — 조용한 쪽만 동작하는 한쪽 방향 버그 방지', () => {
        const sampleRate = 44100
        // 진폭 0.98 ≈ -0.18dBFS, -1dBFS(0.891)보다 큼 → 감쇠되어야 함
        const loud: PcmAudio = {interleaved: generateSineWave(440, 0.5, sampleRate, 0.98, 2), sampleRate, channels: 2}

        const result = autoNormalize(loud, -1)

        const resultPeakDb = amplitudeToDbfs(peakAmplitude(result.interleaved))
        expect(resultPeakDb).toBeLessThan(amplitudeToDbfs(peakAmplitude(loud.interleaved)))
        expect(resultPeakDb).toBeCloseTo(-1, 0)
    })

    it('이미 목표 피크와 같으면 사실상 변화가 없다', () => {
        const sampleRate = 44100
        // -1dBFS ≈ 0.891
        const targetAmplitude = Math.pow(10, -1 / 20)
        const audio: PcmAudio = {interleaved: generateSineWave(440, 0.3, sampleRate, targetAmplitude, 2), sampleRate, channels: 2}

        const result = autoNormalize(audio, -1)

        expect(peakAmplitude(result.interleaved)).toBeCloseTo(peakAmplitude(audio.interleaved), 2)
    })

    it('무음(피크 0)은 나누기 0을 일으키지 않고 그대로 무음을 반환한다', () => {
        const sampleRate = 44100
        const silence: PcmAudio = {interleaved: new Float32Array(sampleRate), sampleRate, channels: 1}

        const result = autoNormalize(silence, -1)

        expect(peakAmplitude(result.interleaved)).toBe(0)
        expect(result.interleaved.every(v => Number.isFinite(v))).toBe(true)
    })
})

describe('manualGain', () => {
    it('조용한 오디오에 +12dB를 적용하면 피크가 실제로 커진다', () => {
        const sampleRate = 44100
        const quiet: PcmAudio = {interleaved: generateSineWave(440, 0.3, sampleRate, 0.1, 2), sampleRate, channels: 2}

        const result = manualGain(quiet, 12)

        expect(peakAmplitude(result.interleaved)).toBeGreaterThan(peakAmplitude(quiet.interleaved))
        // 12dB ≈ 4배
        expect(peakAmplitude(result.interleaved)).toBeCloseTo(peakAmplitude(quiet.interleaved) * Math.pow(10, 12 / 20), 2)
    })

    it('과도한 증폭을 지정해도 결과 피크가 0dBFS(진폭 1.0)를 넘지 않는다(클리핑 자동 방지)', () => {
        const sampleRate = 44100
        const audio: PcmAudio = {interleaved: generateSineWave(440, 0.3, sampleRate, 0.5, 2), sampleRate, channels: 2}

        const result = manualGain(audio, 40) // +40dB(100배) — 과도한 증폭 요청

        expect(peakAmplitude(result.interleaved)).toBeLessThanOrEqual(1.0)
        // 클리핑 방지가 "그냥 증폭 안 함"으로 퉁친 게 아니라 실제로 커지긴 했는지도 확인
        expect(peakAmplitude(result.interleaved)).toBeGreaterThan(peakAmplitude(audio.interleaved))
    })

    it('음수 dB(감쇠)를 지정하면 피크가 작아진다', () => {
        const sampleRate = 44100
        const audio: PcmAudio = {interleaved: generateSineWave(440, 0.3, sampleRate, 0.8, 2), sampleRate, channels: 2}

        const result = manualGain(audio, -6)

        expect(peakAmplitude(result.interleaved)).toBeLessThan(peakAmplitude(audio.interleaved))
    })

    it('sampleRate와 channels를 보존한다', () => {
        const audio: PcmAudio = {interleaved: generateSineWave(440, 0.3, 22050, 0.3, 1), sampleRate: 22050, channels: 1}

        const result = manualGain(audio, 3)

        expect(result.sampleRate).toBe(22050)
        expect(result.channels).toBe(1)
    })
})
