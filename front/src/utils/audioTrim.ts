import type {PcmAudio} from './audioTypes'

/** startSeconds~endSeconds 구간만 남기고 잘라낸다. 경계는 정확한 샘플 인덱스로 계산한다. */
export function trim(audio: PcmAudio, startSeconds: number, endSeconds: number): PcmAudio {
    const {interleaved, sampleRate, channels} = audio
    const totalFrames = interleaved.length / channels

    const startFrame = Math.max(0, Math.round(startSeconds * sampleRate))
    const endFrame = Math.min(totalFrames, Math.round(endSeconds * sampleRate))

    return {
        interleaved: interleaved.slice(startFrame * channels, endFrame * channels),
        sampleRate,
        channels,
    }
}
