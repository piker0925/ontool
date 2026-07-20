import {describe, expect, it, beforeEach, afterEach} from 'vitest'
import {flushPromises, mount} from '@vue/test-utils'
import AudioDropzone from './AudioDropzone.vue'

// jsdom에는 AudioContext가 없으므로, decodeAudioData가 반환하는 AudioBuffer를 흉내낸
// 가짜 AudioContext를 전역에 심어 컴포넌트의 디코드 파이프라인(File → PcmAudio)만 검증한다.
// 실제 브라우저 디코딩 정확도는 최종 브라우저 검증 단계에서 확인한다.
class FakeAudioContext {
    decodeAudioData(_buf: ArrayBuffer) {
        return Promise.resolve({
            numberOfChannels: 2,
            sampleRate: 44100,
            length: 3,
            getChannelData: (ch: number) => (ch === 0 ? new Float32Array([1, 2, 3]) : new Float32Array([4, 5, 6])),
        })
    }
    close() {
        return Promise.resolve()
    }
}

class FailingAudioContext {
    decodeAudioData(_buf: ArrayBuffer) {
        return Promise.reject(new Error('디코딩 실패'))
    }
    close() {
        return Promise.resolve()
    }
}

beforeEach(() => {
    // @ts-expect-error 테스트 환경 전역 스텁
    window.AudioContext = FakeAudioContext
})
afterEach(() => {
    // @ts-expect-error 테스트 환경 전역 스텁 정리
    delete window.AudioContext
})

async function selectFile(wrapper: ReturnType<typeof mount>, file: File) {
    const input = wrapper.find('input[type="file"]').element as HTMLInputElement
    Object.defineProperty(input, 'files', {value: [file], configurable: true})
    await wrapper.find('input[type="file"]').trigger('change')
    await flushPromises()
}

describe('AudioDropzone', () => {
    it('파일을 선택하면 디코딩해 loaded 이벤트로 인터리브 PcmAudio를 emit한다', async () => {
        const wrapper = mount(AudioDropzone)

        await selectFile(wrapper, new File(['dummy'], 'test.wav', {type: 'audio/wav'}))

        const emitted = wrapper.emitted('loaded')
        expect(emitted).toBeTruthy()
        const payload = emitted![0][0] as {pcm: {interleaved: Float32Array, sampleRate: number, channels: number}, file: File}
        expect(payload.pcm.sampleRate).toBe(44100)
        expect(payload.pcm.channels).toBe(2)
        expect(Array.from(payload.pcm.interleaved)).toEqual([1, 4, 2, 5, 3, 6])
        expect(payload.file.name).toBe('test.wav')
    })

    it('디코딩에 실패하면 error 이벤트를 emit하고 loaded는 emit하지 않는다', async () => {
        // @ts-expect-error 테스트 환경 전역 스텁 교체
        window.AudioContext = FailingAudioContext
        const wrapper = mount(AudioDropzone)

        await selectFile(wrapper, new File(['bad'], 'broken.mp3', {type: 'audio/mp3'}))

        expect(wrapper.emitted('loaded')).toBeFalsy()
        expect(wrapper.emitted('error')).toBeTruthy()
    })

    it('디코딩 중에는 로딩 상태 문구를 보여준다', async () => {
        let resolveDecode: (v: unknown) => void = () => {}
        class SlowAudioContext {
            decodeAudioData() {
                return new Promise(resolve => {
                    resolveDecode = resolve
                })
            }
            close() {
                return Promise.resolve()
            }
        }
        // @ts-expect-error 테스트 환경 전역 스텁 교체
        window.AudioContext = SlowAudioContext

        const wrapper = mount(AudioDropzone)
        const input = wrapper.find('input[type="file"]').element as HTMLInputElement
        Object.defineProperty(input, 'files', {value: [new File(['a'], 'a.wav')], configurable: true})
        await wrapper.find('input[type="file"]').trigger('change')
        await wrapper.vm.$nextTick()

        expect(wrapper.text()).toContain('디코딩')

        resolveDecode({numberOfChannels: 1, sampleRate: 8000, length: 1, getChannelData: () => new Float32Array([0])})
        await flushPromises()
        expect(wrapper.text()).not.toContain('디코딩 중')
    })
})
