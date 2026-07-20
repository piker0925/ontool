import {describe, expect, it} from 'vitest'
import {encodeWav, encodeMp3} from './audioEncode'
import type {PcmAudio} from './audioTypes'
import {decodeWavForTest, generateSineWave, peakAmplitude} from '../test/audioTestHelpers'

describe('encodeWav', () => {
    it('생성된 바이트가 RIFF/WAVE 헤더로 시작한다(트리비얼한 no-op이 아님)', () => {
        const audio: PcmAudio = {interleaved: generateSineWave(440, 0.1, 44100, 0.5, 2), sampleRate: 44100, channels: 2}
        const wav = encodeWav(audio)

        expect(wav.length).toBeGreaterThan(audio.interleaved.length) // 헤더만큼 원본보다 커야 함
        const header = String.fromCharCode(wav[0], wav[1], wav[2], wav[3])
        expect(header).toBe('RIFF')
    })

    it('독립적으로 구현한 디코더로 다시 읽으면 원본 샘플레이트·채널·피크가 보존된다', () => {
        const original: PcmAudio = {interleaved: generateSineWave(440, 0.2, 44100, 0.7, 2), sampleRate: 44100, channels: 2}
        const wav = encodeWav(original)

        const decoded = decodeWavForTest(wav)

        expect(decoded.sampleRate).toBe(44100)
        expect(decoded.channels).toBe(2)
        expect(decoded.interleaved.length).toBe(original.interleaved.length)
        // 16비트 양자화 오차 허용
        expect(peakAmplitude(decoded.interleaved)).toBeCloseTo(peakAmplitude(original.interleaved), 2)
    })

    it('모노 오디오도 정확히 인코딩·디코딩된다(채널 수가 스테레오로 고정되지 않는지 확인)', () => {
        const original: PcmAudio = {interleaved: generateSineWave(220, 0.1, 22050, 0.4, 1), sampleRate: 22050, channels: 1}
        const wav = encodeWav(original)

        const decoded = decodeWavForTest(wav)

        expect(decoded.channels).toBe(1)
        expect(decoded.sampleRate).toBe(22050)
        expect(decoded.interleaved.length).toBe(original.interleaved.length)
    })
})

describe('encodeMp3', () => {
    it('유효한 MP3 프레임 동기 헤더로 시작하는 비어있지 않은 바이트를 생성한다', () => {
        const audio: PcmAudio = {interleaved: generateSineWave(440, 0.5, 44100, 0.5, 2), sampleRate: 44100, channels: 2}
        const mp3 = encodeMp3(audio)

        expect(mp3.length).toBeGreaterThan(500) // 0.5초 분량이면 최소 이 정도는 나와야 함
        // MP3 프레임 동기워드: 첫 11비트가 모두 1 (0xFF, 0xEx~0xFx)
        expect(mp3[0]).toBe(0xff)
        expect(mp3[1] & 0xe0).toBe(0xe0)
    })

    it('모노 소스도 인코딩 가능하다', () => {
        const audio: PcmAudio = {interleaved: generateSineWave(440, 0.3, 44100, 0.5, 1), sampleRate: 44100, channels: 1}
        const mp3 = encodeMp3(audio)

        expect(mp3.length).toBeGreaterThan(100)
        expect(mp3[0]).toBe(0xff)
    })

    it('무음이 아닌 서로 다른 두 입력은 서로 다른 바이트를 만든다(트리비얼한 no-op이 아님)', () => {
        const low: PcmAudio = {interleaved: generateSineWave(220, 0.3, 44100, 0.5, 2), sampleRate: 44100, channels: 2}
        const high: PcmAudio = {interleaved: generateSineWave(880, 0.3, 44100, 0.5, 2), sampleRate: 44100, channels: 2}

        const mp3Low = encodeMp3(low)
        const mp3High = encodeMp3(high)

        expect(Array.from(mp3Low)).not.toEqual(Array.from(mp3High))
    })

    // Node 환경에는 실용적인 mp3 디코더가 없어(스택에 준비된 게 없음) 전체 디코드→비교
    // 라운드트립은 어렵다. 대신 이 인코더가 항상 고정 비트레이트(CBR, VBR 미사용)로 인코딩
    // 한다는 사실을 이용해, "바이트 수 × 8 / 비트레이트"로 mp3 자체의 재생 길이를 인코더
    // 내부 로직과 무관하게 독립적으로 역산하고, 원본 PCM 길이와 비교한다 — 075 스펙의
    // "무음 처리 등으로 잘리지 않는지 검증" 요구를 다룬다. 실제 재생 가능 여부는 최종
    // 브라우저 검증에서 확인한다(이 테스트는 "길이가 잘리지 않았는지"만 본다).
    it('인코딩된 mp3의 재생 길이가 원본 PCM 길이 근처(잘리지 않음)다 — 바이트 수 기반 독립 역산', () => {
        const sampleRate = 44100
        const durationSec = 2
        const kbps = 128
        const audio: PcmAudio = {interleaved: generateSineWave(440, durationSec, sampleRate, 0.5, 2), sampleRate, channels: 2}

        const mp3 = encodeMp3(audio, kbps)

        const estimatedMp3DurationSec = (mp3.length * 8) / (kbps * 1000)

        // 인코더 지연(디코더 워밍업, 보통 1~2프레임=1152~2304샘플≈26~52ms)과 프레임 단위
        // 양자화(1152샘플≈26ms)로 약간 길어질 수 있지만, "잘림"이 있다면 초 단위로 짧게
        // 나오므로 0.3초 오차 허용이면 잘림과 정상 인코딩을 명확히 구분할 수 있다.
        expect(estimatedMp3DurationSec).toBeGreaterThan(durationSec - 0.3)
        expect(estimatedMp3DurationSec).toBeLessThan(durationSec + 0.3)
    })
})
