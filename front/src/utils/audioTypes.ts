/**
 * 오디오 도구들이 공유하는 순수 PCM 표현. Web Audio 타입(AudioBuffer 등)에
 * 의존하지 않아 Node(vitest)에서도 그대로 단위 테스트할 수 있다.
 * 채널이 인터리브(LRLRLR...)되어 있다 — Web Audio의 채널별 분리 배열과 다르다.
 */
export interface PcmAudio {
    interleaved: Float32Array
    sampleRate: number
    channels: number
}

export function frameCount(audio: PcmAudio): number {
    return audio.interleaved.length / audio.channels
}

export function durationSeconds(audio: PcmAudio): number {
    return frameCount(audio) / audio.sampleRate
}
