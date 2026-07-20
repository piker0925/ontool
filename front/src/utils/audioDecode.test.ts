import {describe, expect, it} from 'vitest'
import {audioBufferLikeToPcm} from './audioDecode'

// AudioContext가 없는 vitest(jsdom) 환경에서도 테스트할 수 있도록, decodeAudioData가
// 반환하는 실제 AudioBuffer의 필요한 부분(duck type)만 흉내낸다.
function fakeAudioBuffer(channelsData: number[][], sampleRate: number) {
    return {
        numberOfChannels: channelsData.length,
        sampleRate,
        length: channelsData[0].length,
        getChannelData: (ch: number) => new Float32Array(channelsData[ch]),
    }
}

describe('audioBufferLikeToPcm', () => {
    it('스테레오 AudioBuffer를 인터리브(LRLR...) PcmAudio로 변환한다', () => {
        const buffer = fakeAudioBuffer([[1, 2, 3], [10, 20, 30]], 44100)

        const pcm = audioBufferLikeToPcm(buffer)

        expect(pcm.channels).toBe(2)
        expect(pcm.sampleRate).toBe(44100)
        expect(Array.from(pcm.interleaved)).toEqual([1, 10, 2, 20, 3, 30])
    })

    it('모노 AudioBuffer는 채널 1개로 그대로 변환한다', () => {
        const buffer = fakeAudioBuffer([[5, 6, 7]], 22050)

        const pcm = audioBufferLikeToPcm(buffer)

        expect(pcm.channels).toBe(1)
        expect(Array.from(pcm.interleaved)).toEqual([5, 6, 7])
    })
})
