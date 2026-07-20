import type {PcmAudio} from './audioTypes'

function peakAmplitudeOf(interleaved: Float32Array): number {
    let peak = 0
    for (const v of interleaved) {
        const abs = Math.abs(v)
        if (abs > peak) peak = abs
    }
    return peak
}

function dbToAmplitudeRatio(db: number): number {
    return Math.pow(10, db / 20)
}

function scale(interleaved: Float32Array, factor: number): Float32Array {
    const out = new Float32Array(interleaved.length)
    for (let i = 0; i < interleaved.length; i++) out[i] = interleaved[i] * factor
    return out
}

/**
 * 피크를 분석해 목표 피크(dBFS)에 맞춰 자동으로 증폭/감쇠한다 — 조용한 오디오는
 * 커지고 큰 오디오는 작아진다(양방향). 무음(피크 0)은 나누기 0을 피해 그대로 반환한다.
 */
export function autoNormalize(audio: PcmAudio, targetPeakDb = -1): PcmAudio {
    const currentPeak = peakAmplitudeOf(audio.interleaved)
    if (currentPeak === 0) return {...audio}

    const targetAmplitude = dbToAmplitudeRatio(targetPeakDb)
    const factor = targetAmplitude / currentPeak

    return {
        interleaved: scale(audio.interleaved, factor),
        sampleRate: audio.sampleRate,
        channels: audio.channels,
    }
}

/**
 * 사용자가 지정한 dB만큼 게인을 적용한다. 결과 피크가 0dBFS(진폭 1.0)를 넘으면
 * 자동으로 스케일을 낮춰 클리핑을 방지한다(무조건 증폭만 하고 방치하지 않음).
 */
export function manualGain(audio: PcmAudio, gainDb: number): PcmAudio {
    const requestedFactor = dbToAmplitudeRatio(gainDb)
    const currentPeak = peakAmplitudeOf(audio.interleaved)

    let factor = requestedFactor
    if (currentPeak > 0) {
        const resultingPeak = currentPeak * requestedFactor
        if (resultingPeak > 1) {
            factor = 1 / currentPeak
        }
    }

    return {
        interleaved: scale(audio.interleaved, factor),
        sampleRate: audio.sampleRate,
        channels: audio.channels,
    }
}
