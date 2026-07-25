import {describe, expect, it} from 'vitest'
import {sniffWavSampleRate} from './wavSampleRateSniff'
import {encodeWav} from './audioEncode'
import {generateSineWave} from '../test/audioTestHelpers'
import type {PcmAudio} from './audioTypes'

describe('sniffWavSampleRate', () => {
    it('WAV 헤더의 실제 샘플레이트를 읽는다(48000)', () => {
        const audio: PcmAudio = {interleaved: generateSineWave(440, 0.05, 48000, 0.3, 2), sampleRate: 48000, channels: 2}
        const wav = encodeWav(audio)

        expect(sniffWavSampleRate(wav.buffer as ArrayBuffer)).toBe(48000)
    })

    it('다른 샘플레이트(96000)도 정확히 구분한다 — 고정값을 반환하는 게 아님을 확인', () => {
        const audio: PcmAudio = {interleaved: generateSineWave(440, 0.05, 96000, 0.3, 1), sampleRate: 96000, channels: 1}
        const wav = encodeWav(audio)

        expect(sniffWavSampleRate(wav.buffer as ArrayBuffer)).toBe(96000)
    })

    it('RIFF/WAVE 매직이 없으면 null(WAV가 아님, 예: mp3)', () => {
        const notWav = new Uint8Array([0xff, 0xe0, 1, 2, 3, 4, 5, 6, 7, 8]).buffer
        expect(sniffWavSampleRate(notWav)).toBeNull()
    })

    it('헤더보다 짧은 조각이면 null(경계값)', () => {
        const tooShort = new Uint8Array(10).buffer
        expect(sniffWavSampleRate(tooShort)).toBeNull()
    })
})
