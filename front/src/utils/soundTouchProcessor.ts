import {SimpleFilter, SoundTouch} from 'soundtouchjs'
import type {PcmAudio} from './audioTypes'

// SoundTouchJS의 SimpleFilter는 항상 인터리브 스테레오(Float32Array, LRLR...)를 기대한다.
// 모노 입력은 좌우로 복제해 처리하고, 처리 후 다시 평균내어 모노로 되돌린다.

export function toStereoInterleaved(audio: PcmAudio): Float32Array {
    if (audio.channels === 2) return audio.interleaved
    if (audio.channels === 1) {
        const frames = audio.interleaved.length
        const stereo = new Float32Array(frames * 2)
        for (let i = 0; i < frames; i++) {
            stereo[i * 2] = audio.interleaved[i]
            stereo[i * 2 + 1] = audio.interleaved[i]
        }
        return stereo
    }
    // 3채널 이상은 앞 2채널만 사용(이 도구들이 다루는 입력은 모노/스테레오로 한정 — ADR 없음,
    // 실무적으로 브라우저 업로드 오디오는 거의 항상 모노/스테레오).
    const frames = audio.interleaved.length / audio.channels
    const stereo = new Float32Array(frames * 2)
    for (let i = 0; i < frames; i++) {
        stereo[i * 2] = audio.interleaved[i * audio.channels]
        stereo[i * 2 + 1] = audio.interleaved[i * audio.channels + 1]
    }
    return stereo
}

export function fromStereoInterleaved(stereo: Float32Array, targetChannels: number): Float32Array {
    const frames = stereo.length / 2
    if (targetChannels === 2) return stereo
    if (targetChannels === 1) {
        const mono = new Float32Array(frames)
        for (let i = 0; i < frames; i++) {
            mono[i] = (stereo[i * 2] + stereo[i * 2 + 1]) / 2
        }
        return mono
    }
    throw new Error(`지원하지 않는 채널 수: ${targetChannels}`)
}

class ArraySource {
    private readonly data: Float32Array
    readonly frameCount: number

    constructor(interleavedStereo: Float32Array) {
        this.data = interleavedStereo
        this.frameCount = interleavedStereo.length / 2
    }

    extract(target: Float32Array, numFrames: number, position: number): number {
        const framesAvailable = Math.max(0, this.frameCount - position)
        const framesToCopy = Math.min(numFrames, framesAvailable)
        for (let i = 0; i < framesToCopy * 2; i++) {
            target[i] = this.data[position * 2 + i]
        }
        return framesToCopy
    }
}

/**
 * SoundTouch 파이프라인을 통과시켜 스테레오 인터리브 Float32Array를 처리한다.
 * 파이프라인 내부 버퍼링 지연(SimpleFilter의 historyBufferSize=22050 프레임 + Stretch의
 * 자체 처리 지연)을 완전히 비우기 위해 입력 끝에 무음 1초(sampleRate 프레임)를 덧붙인 뒤
 * 처리한다 — 이보다 적게 패딩하면(예: 8192프레임) 배속 조절처럼 tempo가 1이 아닌 경우
 * 파이프라인이 조기에 고갈되어 실제 신호의 꼬리 부분이 통째로 잘려나가는 문제가 있었다
 * (074 리뷰에서 발견 — 무음이 아니라 "진짜 신호 손실"이었다). 충분히 패딩하면 반환값 끝에
 * 무음 구간이 남으므로, 길이를 맞춰야 하는 호출부는 반드시 trimOrPadToLength로 정리한다.
 */
export function runSoundTouch(stereoInterleaved: Float32Array, sampleRate: number, configure: (st: SoundTouch) => void): Float32Array {
    const st = new SoundTouch()
    configure(st)

    const tailPaddingFrames = sampleRate
    const sourceFrames = stereoInterleaved.length / 2
    const padded = new Float32Array((sourceFrames + tailPaddingFrames) * 2)
    padded.set(stereoInterleaved)

    const source = new ArraySource(padded)
    const filter = new SimpleFilter(source, st)

    const chunkFrames = 4096
    const chunkBuf = new Float32Array(chunkFrames * 2)
    const outChunks: Float32Array[] = []
    let totalFrames = 0

    // 안전장치: 파이프라인이 절대 끝나지 않는 이상 상황을 방지하기 위한 상한.
    const maxIterations = 100000
    for (let iter = 0; iter < maxIterations; iter++) {
        const extracted = filter.extract(chunkBuf, chunkFrames)
        if (extracted === 0) break
        outChunks.push(chunkBuf.slice(0, extracted * 2))
        totalFrames += extracted
    }

    const result = new Float32Array(totalFrames * 2)
    let offset = 0
    for (const chunk of outChunks) {
        result.set(chunk, offset)
        offset += chunk.length
    }
    return result
}

/**
 * 스테레오 인터리브 결과를 목표 프레임 수로 정확히 맞춘다 — 길면 자르고(패딩으로 생긴
 * 무음 꼬리 제거), 짧으면 무음으로 채운다(이론상 충분히 패딩했다면 짧을 일은 없어야
 * 하지만 방어적으로 둔다).
 */
export function trimOrPadToLength(stereo: Float32Array, targetFrames: number): Float32Array {
    const currentFrames = stereo.length / 2
    if (currentFrames === targetFrames) return stereo
    const result = new Float32Array(targetFrames * 2)
    result.set(stereo.subarray(0, Math.min(currentFrames, targetFrames) * 2))
    return result
}
