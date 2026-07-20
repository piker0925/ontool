// soundtouchjs(0.3.0)는 자체 타입 선언을 제공하지 않는다. 이 프로젝트가 실제로 쓰는
// 최소 표면(SoundTouch의 tempo/pitch 파라미터, SimpleFilter의 소스 어댑터 + extract)만 선언한다.
declare module 'soundtouchjs' {
    export interface SoundTouchSource {
        extract(target: Float32Array, numFrames: number, position: number): number
    }

    export class SoundTouch {
        tempo: number
        pitch: number
        pitchSemitones: number
        rate: number
    }

    export class SimpleFilter {
        constructor(sourceSound: SoundTouchSource, pipe: SoundTouch, callback?: () => void)
        sourcePosition: number
        position: number
        extract(target: Float32Array, numFrames: number): number
    }
}
