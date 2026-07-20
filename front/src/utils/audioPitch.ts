import type {PcmAudio} from './audioTypes'
import {fromStereoInterleaved, runSoundTouch, toStereoInterleaved, trimOrPadToLength} from './soundTouchProcessor'

/**
 * 피치만 반음(semitone) 단위로 조절하고 배속(길이)은 그대로 유지한다.
 * SoundTouch의 tempo=1로 고정해 배속 변경 없이 피치만 이동시킨다.
 */
export function shiftPitch(audio: PcmAudio, semitones: number): PcmAudio {
    const stereoIn = toStereoInterleaved(audio)
    const originalFrames = stereoIn.length / 2

    const processed = runSoundTouch(stereoIn, audio.sampleRate, st => {
        st.tempo = 1
        st.pitchSemitones = semitones
    })

    // 피치 전용 조절은 길이가 원본과 정확히 동일해야 한다(AC) — 파이프라인 플러시용으로
    // 덧댄 무음 패딩 때문에 원본보다 길게 나오므로 정확히 원본 프레임 수로 자른다.
    const trimmed = trimOrPadToLength(processed, originalFrames)

    return {
        interleaved: fromStereoInterleaved(trimmed, audio.channels),
        sampleRate: audio.sampleRate,
        channels: audio.channels,
    }
}
