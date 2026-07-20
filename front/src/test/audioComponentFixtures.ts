// 오디오 도구 5종(피치·배속·트리밍·변환·볼륨)의 컴포넌트 테스트가 공유하는 마운트 픽스처.
// audioTestHelpers.ts(순수 신호 처리 helper, 프로덕션 코드 비의존)와는 목적이 달라 분리했다 —
// 여기는 AudioDropzone의 디코딩과 AudioWaveformPlayer의 재생에 필요한 가짜 AudioContext,
// 그리고 파일 업로드 트리거처럼 "컴포넌트를 마운트해 통합 배선을 검증"하는 데만 쓰는 DOM 픽스처다.
import {flushPromises, mount} from '@vue/test-utils'
import {generateSineWave} from './audioTestHelpers'

class FakeSourceNode {
    buffer: unknown = null
    onended: (() => void) | null = null
    connect() {}
    start() {}
    stop() { this.onended?.() }
}

class FakeAudioContext {
    destination = {}
    decodeAudioData(_buf: ArrayBuffer) {
        const sampleRate = 44100
        const interleaved = generateSineWave(440, 0.3, sampleRate, 0.5, 2)
        const frames = interleaved.length / 2
        return Promise.resolve({
            numberOfChannels: 2,
            sampleRate,
            length: frames,
            getChannelData: (ch: number) => {
                const out = new Float32Array(frames)
                for (let i = 0; i < frames; i++) out[i] = interleaved[i * 2 + ch]
                return out
            },
        })
    }
    createBuffer(channels: number, length: number) {
        return {numberOfChannels: channels, length, copyToChannel: () => {}, getChannelData: () => new Float32Array(length)}
    }
    createBufferSource() {
        return new FakeSourceNode()
    }
    close() {
        return Promise.resolve()
    }
}

export function installFakeAudioContext() {
    // @ts-expect-error 테스트 환경 전역 스텁
    window.AudioContext = FakeAudioContext
}

export function uninstallFakeAudioContext() {
    // @ts-expect-error 테스트 환경 전역 스텁 정리
    delete window.AudioContext
}

export async function uploadFile(wrapper: ReturnType<typeof mount>) {
    const input = wrapper.find('input[type="file"]').element as HTMLInputElement
    Object.defineProperty(input, 'files', {value: [new File(['dummy'], 'test.wav', {type: 'audio/wav'})], configurable: true})
    await wrapper.find('input[type="file"]').trigger('change')
    await flushPromises()
}
