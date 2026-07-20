import {describe, expect, it, vi, beforeEach, afterEach} from 'vitest'
import {flushPromises, mount} from '@vue/test-utils'
import AudioConvertTool from './AudioConvertTool.vue'
import {installFakeAudioContext, uninstallFakeAudioContext, uploadFile} from '../../test/audioComponentFixtures'
import {decodeWavForTest, generateSineWave} from '../../test/audioTestHelpers'

beforeEach(installFakeAudioContext)
afterEach(uninstallFakeAudioContext)

describe('AudioConvertTool', () => {
    it('파일 업로드 전에는 처리 도구 패널이 보이지 않는다', () => {
        const wrapper = mount(AudioConvertTool)
        expect(wrapper.find('[data-testid="tool-panel"]').exists()).toBe(false)
    })

    it('업로드하면 원본 파형/재생 컨트롤과 도구 패널이 나타난다', async () => {
        const wrapper = mount(AudioConvertTool)
        await uploadFile(wrapper)

        expect(wrapper.find('[data-testid="tool-panel"]').exists()).toBe(true)
        expect(wrapper.findAll('canvas').length).toBeGreaterThan(0)
        expect(wrapper.findAll('[data-testid="play-pause-button"]').length).toBeGreaterThan(0)
    })

    it('적용하면 원본과 동일한 오디오로 결과·다운로드 버튼이 나타난다', async () => {
        const wrapper = mount(AudioConvertTool)
        await uploadFile(wrapper)

        await wrapper.find('[data-testid="apply-convert"]').trigger('click')
        await flushPromises()

        expect(wrapper.find('[data-testid="download-wav"]').exists()).toBe(true)
        expect(wrapper.find('[data-testid="download-mp3"]').exists()).toBe(true)
    })

    // 위 테스트는 버튼 존재만 확인한다 — "포맷만 바뀌고 신호는 그대로"라는 이 도구의 유일한 주장은
    // 존재 확인만으로는 검증되지 않는다(runTool에 넘기는 변환 함수가 무음이나 다른 신호를 반환해도
    // 통과함). 여기서는 다운로드되는 WAV를 실제로 디코드해 원본 신호(업로드 시 FakeAudioContext가
    // 만든 440Hz 사인파)와 표본 단위로 비교해 내용 동일성을 확인한다.
    it('WAV로 다운로드한 결과를 디코드하면 원본과 동일한 표본값을 담고 있다(포맷만 바뀌고 신호는 보존됨)', async () => {
        const createObjectURLSpy: ReturnType<typeof vi.fn> = vi.fn(() => 'blob:fake-url')
        URL.createObjectURL = createObjectURLSpy as unknown as typeof URL.createObjectURL
        URL.revokeObjectURL = vi.fn()
        HTMLAnchorElement.prototype.click = vi.fn()

        const wrapper = mount(AudioConvertTool)
        await uploadFile(wrapper)

        await wrapper.find('[data-testid="apply-convert"]').trigger('click')
        await flushPromises()
        await wrapper.find('[data-testid="download-wav"]').trigger('click')

        expect(createObjectURLSpy).toHaveBeenCalledTimes(1)
        const blob = createObjectURLSpy.mock.calls[0][0] as Blob
        const bytes = new Uint8Array(await blob.arrayBuffer())
        const decoded = decodeWavForTest(bytes)

        // audioComponentFixtures.ts의 FakeAudioContext.decodeAudioData가 만드는 원본과 동일한 신호.
        const original = generateSineWave(440, 0.3, 44100, 0.5, 2)

        expect(decoded.sampleRate).toBe(44100)
        expect(decoded.channels).toBe(2)
        expect(decoded.interleaved.length).toBe(original.length)
        for (let i = 0; i < original.length; i += 97) {
            // 16비트 PCM 왕복(원본 Float32 → WAV 16비트 → 디코드)의 양자화 오차 범위 내에서 일치.
            expect(decoded.interleaved[i]).toBeCloseTo(original[i], 3)
        }
    })
})
