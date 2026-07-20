import {describe, expect, it, vi, beforeEach, afterEach} from 'vitest'
import {mount} from '@vue/test-utils'
import AudioDownloadButtons from './AudioDownloadButtons.vue'
import type {PcmAudio} from '../../utils/audioTypes'
import {generateSineWave} from '../../test/audioTestHelpers'

function makePcm(): PcmAudio {
    return {interleaved: generateSineWave(440, 0.2, 44100, 0.5, 2), sampleRate: 44100, channels: 2}
}

describe('AudioDownloadButtons', () => {
    let createObjectURLSpy: ReturnType<typeof vi.fn>
    let anchorClickSpy: ReturnType<typeof vi.fn>

    beforeEach(() => {
        createObjectURLSpy = vi.fn(() => 'blob:fake-url')
        URL.createObjectURL = createObjectURLSpy as unknown as typeof URL.createObjectURL
        URL.revokeObjectURL = vi.fn()
        anchorClickSpy = vi.fn()
        HTMLAnchorElement.prototype.click = anchorClickSpy as unknown as () => void
    })
    afterEach(() => vi.restoreAllMocks())

    it('WAV 다운로드 버튼을 누르면 audio/wav Blob을 만들어 fileNameBase.wav 파일명으로 다운로드를 트리거한다', async () => {
        const wrapper = mount(AudioDownloadButtons, {props: {pcm: makePcm(), fileNameBase: 'myvoice_pitch+3'}})

        await wrapper.find('[data-testid="download-wav"]').trigger('click')

        expect(createObjectURLSpy).toHaveBeenCalledTimes(1)
        const blob = createObjectURLSpy.mock.calls[0][0] as Blob
        expect(blob.type).toBe('audio/wav')
        expect(blob.size).toBeGreaterThan(0)
        expect(anchorClickSpy).toHaveBeenCalledTimes(1)
        const anchor = anchorClickSpy.mock.instances[0] as unknown as HTMLAnchorElement
        expect(anchor.download).toBe('myvoice_pitch+3.wav')
    })

    it('MP3 다운로드 버튼을 누르면 audio/mpeg Blob을 만들어 fileNameBase.mp3 파일명으로 다운로드를 트리거한다', async () => {
        const wrapper = mount(AudioDownloadButtons, {props: {pcm: makePcm(), fileNameBase: 'myvoice_pitch+3'}})

        await wrapper.find('[data-testid="download-mp3"]').trigger('click')

        expect(createObjectURLSpy).toHaveBeenCalledTimes(1)
        const blob = createObjectURLSpy.mock.calls[0][0] as Blob
        expect(blob.type).toBe('audio/mpeg')
        expect(blob.size).toBeGreaterThan(0)
        expect(anchorClickSpy).toHaveBeenCalledTimes(1)
        const anchor = anchorClickSpy.mock.instances[0] as unknown as HTMLAnchorElement
        expect(anchor.download).toBe('myvoice_pitch+3.mp3')
    })

    it('두 버튼이 만드는 Blob 크기가 서로 다르다(같은 인코더를 복붙해 트리비얼하게 통과하는 게 아님을 확인)', async () => {
        const wrapper = mount(AudioDownloadButtons, {props: {pcm: makePcm(), fileNameBase: 'result'}})

        await wrapper.find('[data-testid="download-wav"]').trigger('click')
        const wavBlob = createObjectURLSpy.mock.calls[0][0] as Blob

        await wrapper.find('[data-testid="download-mp3"]').trigger('click')
        const mp3Blob = createObjectURLSpy.mock.calls[1][0] as Blob

        expect(wavBlob.size).not.toBe(mp3Blob.size)
    })
})
