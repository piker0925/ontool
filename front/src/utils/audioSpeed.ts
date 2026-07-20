import type {PcmAudio} from './audioTypes'
import {fromStereoInterleaved, runSoundTouch, toStereoInterleaved, trimOrPadToLength} from './soundTouchProcessor'

/**
 * 배속을 조절한다.
 * - preservePitch=true: SoundTouch의 tempo만 바꿔 배속에 비례해 길이가 변하되 피치는 유지한다.
 * - preservePitch=false: 단순 리샘플(선형보간)로 배속과 피치가 함께 변한다(테이프 재생 속도 조절과 동일한 효과).
 */
export function changeSpeed(audio: PcmAudio, rate: number, preservePitch: boolean): PcmAudio {
    if (preservePitch) {
        const stereoIn = toStereoInterleaved(audio)
        const originalFrames = stereoIn.length / 2
        const processed = runSoundTouch(stereoIn, audio.sampleRate, st => {
            st.tempo = rate
            st.pitchSemitones = 0
        })

        // runSoundTouch는 파이프라인을 완전히 비우려고 무음을 넉넉히 덧대므로, tempo!=1일 때도
        // 결과 끝에 무음 꼬리가 남는다 — 목표 길이(원본/rate)로 정확히 잘라 무음 꼬리가
        // 다운로드본에 섞여 들어가지 않게 한다(074 리뷰에서 발견된 실제 오디오 결함).
        const targetFrames = Math.max(1, Math.round(originalFrames / rate))
        const trimmed = trimOrPadToLength(processed, targetFrames)

        return {
            interleaved: fromStereoInterleaved(trimmed, audio.channels),
            sampleRate: audio.sampleRate,
            channels: audio.channels,
        }
    }

    return {
        interleaved: resampleLinear(audio.interleaved, audio.channels, rate),
        sampleRate: audio.sampleRate,
        channels: audio.channels,
    }
}

/** rate배 빠르게(길이는 1/rate) 재생하는 것과 동일한 효과의 단순 선형보간 리샘플. */
function resampleLinear(interleaved: Float32Array, channels: number, rate: number): Float32Array {
    const sourceFrames = interleaved.length / channels
    const targetFrames = Math.max(1, Math.round(sourceFrames / rate))
    const out = new Float32Array(targetFrames * channels)

    for (let i = 0; i < targetFrames; i++) {
        const sourcePos = i * rate
        const idx0 = Math.floor(sourcePos)
        const idx1 = Math.min(idx0 + 1, sourceFrames - 1)
        const frac = sourcePos - idx0

        for (let c = 0; c < channels; c++) {
            const s0 = interleaved[Math.min(idx0, sourceFrames - 1) * channels + c]
            const s1 = interleaved[idx1 * channels + c]
            out[i * channels + c] = s0 + (s1 - s0) * frac
        }
    }

    return out
}
