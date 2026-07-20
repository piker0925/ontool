import {Mp3Encoder} from '@breezystack/lamejs'
import type {PcmAudio} from './audioTypes'

// vitest 대비 CAUTION: lamejs 원본(zhuker) 패키지는 Node/ESM에서 Mp3Encoder 생성 시
// "MPEGMode is not defined"로 크래시하는 알려진 패키징 버그가 있다(Lame.js가 내부적으로
// require 없이 전역 MPEGMode를 참조). @breezystack/lamejs는 이를 고친 유지보수 포크로,
// API(Mp3Encoder/WavHeader)는 동일하다. 074 스파이크로 검증됨.

/** -1..1 부동소수 샘플을 16비트 PCM 정수로 변환한다 — WAV/MP3 인코딩이 공유하는 단일 규칙. */
function floatToInt16(sample: number): number {
    const clamped = Math.max(-1, Math.min(1, sample))
    return Math.round(clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff)
}

function toInt16(samples: Float32Array): Int16Array {
    const out = new Int16Array(samples.length)
    for (let i = 0; i < samples.length; i++) out[i] = floatToInt16(samples[i])
    return out
}

/** 16비트 PCM WAV로 인코딩한다. */
export function encodeWav(audio: PcmAudio): Uint8Array {
    const {interleaved, sampleRate, channels} = audio
    const bytesPerSample = 2
    const blockAlign = channels * bytesPerSample
    const dataSize = interleaved.length * bytesPerSample
    const buffer = new ArrayBuffer(44 + dataSize)
    const view = new DataView(buffer)

    writeString(view, 0, 'RIFF')
    view.setUint32(4, 36 + dataSize, true)
    writeString(view, 8, 'WAVE')
    writeString(view, 12, 'fmt ')
    view.setUint32(16, 16, true) // fmt 청크 크기
    view.setUint16(20, 1, true) // PCM
    view.setUint16(22, channels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * blockAlign, true) // byte rate
    view.setUint16(32, blockAlign, true)
    view.setUint16(34, bitsPerSampleConst, true)
    writeString(view, 36, 'data')
    view.setUint32(40, dataSize, true)

    let offset = 44
    for (let i = 0; i < interleaved.length; i++) {
        view.setInt16(offset, floatToInt16(interleaved[i]), true)
        offset += 2
    }

    return new Uint8Array(buffer)
}

const bitsPerSampleConst = 16

function writeString(view: DataView, offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i))
    }
}

/** 16비트 PCM 기준 mp3(128kbps)로 인코딩한다. */
export function encodeMp3(audio: PcmAudio, kbps = 128): Uint8Array {
    const {interleaved, sampleRate, channels} = audio
    const encoder = new Mp3Encoder(channels, sampleRate, kbps)
    const blockSize = 1152
    const chunks: Uint8Array[] = []

    const frameCount = interleaved.length / channels

    if (channels === 1) {
        const mono = toInt16(interleaved)
        for (let i = 0; i < frameCount; i += blockSize) {
            const chunk = mono.subarray(i, Math.min(i + blockSize, frameCount))
            const encoded = encoder.encodeBuffer(chunk)
            if (encoded.length > 0) chunks.push(encoded)
        }
    } else {
        // lamejs는 스테레오를 좌/우 분리 채널 배열로 요구한다 — interleaved를 풀어준다.
        const left = new Int16Array(frameCount)
        const right = new Int16Array(frameCount)
        for (let i = 0; i < frameCount; i++) {
            left[i] = floatToInt16(interleaved[i * channels])
            right[i] = floatToInt16(interleaved[i * channels + 1])
        }
        for (let i = 0; i < frameCount; i += blockSize) {
            const end = Math.min(i + blockSize, frameCount)
            const encoded = encoder.encodeBuffer(left.subarray(i, end), right.subarray(i, end))
            if (encoded.length > 0) chunks.push(encoded)
        }
    }

    const tail = encoder.flush()
    if (tail.length > 0) chunks.push(tail)

    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0)
    const result = new Uint8Array(totalLength)
    let offset = 0
    for (const chunk of chunks) {
        result.set(chunk, offset)
        offset += chunk.length
    }
    return result
}
