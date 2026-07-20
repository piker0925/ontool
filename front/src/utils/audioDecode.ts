import type {PcmAudio} from './audioTypes'

/**
 * Web Audio API의 AudioBuffer를 흉내낸 최소 인터페이스 — 이 파일은 실제 AudioBuffer/AudioContext
 * 타입에 의존하지 않는다(순수 함수 규칙, vitest/jsdom에도 AudioContext가 없어 duck typing으로
 * 테스트 가능하게 유지).
 */
export interface AudioBufferLike {
    numberOfChannels: number
    sampleRate: number
    length: number
    getChannelData(channel: number): Float32Array
}

/** AudioContext.decodeAudioData() 결과(AudioBuffer)를 인터리브 PcmAudio로 변환한다. */
export function audioBufferLikeToPcm(buffer: AudioBufferLike): PcmAudio {
    const {numberOfChannels: channels, sampleRate, length} = buffer
    const channelData: Float32Array[] = []
    for (let c = 0; c < channels; c++) channelData.push(buffer.getChannelData(c))

    const interleaved = new Float32Array(length * channels)
    for (let i = 0; i < length; i++) {
        for (let c = 0; c < channels; c++) {
            interleaved[i * channels + c] = channelData[c][i]
        }
    }

    return {interleaved, sampleRate, channels}
}
