import {describe, expect, it, vi, beforeEach, afterEach} from 'vitest'
import {flushPromises, mount} from '@vue/test-utils'
import AudioPitchTool from './AudioPitchTool.vue'
import {installFakeAudioContext, uninstallFakeAudioContext, uploadFile} from '../../test/audioComponentFixtures'

// 신호 처리 자체의 정확성은 utils/audioPitch.test.ts에서 이미 검증했다 — 여기는 "업로드 →
// 파라미터 입력 → 적용 → 결과 표시"라는 이 페이지의 배선을 검증하는 것이 목적이다.
beforeEach(installFakeAudioContext)
afterEach(uninstallFakeAudioContext)

describe('AudioPitchTool', () => {
    it('파일 업로드 전에는 처리 도구 패널이 보이지 않는다', () => {
        const wrapper = mount(AudioPitchTool)
        expect(wrapper.find('[data-testid="tool-panel"]').exists()).toBe(false)
    })

    it('업로드하면 원본 파형/재생 컨트롤과 도구 패널이 나타난다', async () => {
        const wrapper = mount(AudioPitchTool)
        await uploadFile(wrapper)

        expect(wrapper.find('[data-testid="tool-panel"]').exists()).toBe(true)
        expect(wrapper.findAll('canvas').length).toBeGreaterThan(0)
        expect(wrapper.findAll('[data-testid="play-pause-button"]').length).toBeGreaterThan(0)
    })

    it('반음 값을 지정하고 적용하면 결과 파형과 다운로드 버튼이 나타난다', async () => {
        const wrapper = mount(AudioPitchTool)
        await uploadFile(wrapper)

        await wrapper.find('[data-testid="pitch-semitones-input"]').setValue(3)
        await wrapper.find('[data-testid="apply-pitch"]').trigger('click')
        await flushPromises()

        expect(wrapper.find('[data-testid="download-wav"]').exists()).toBe(true)
        expect(wrapper.find('[data-testid="download-mp3"]').exists()).toBe(true)
    })

    it('다운로드 파일명은 업로드한 원본 파일명(test.wav)에 피치 접미사를 붙인 것이다', async () => {
        const wrapper = mount(AudioPitchTool)
        await uploadFile(wrapper) // audioComponentFixtures.uploadFile()은 항상 test.wav로 업로드한다

        await wrapper.find('[data-testid="pitch-semitones-input"]').setValue(3)
        await wrapper.find('[data-testid="apply-pitch"]').trigger('click')
        await flushPromises()

        const anchorClickSpy = vi.fn()
        HTMLAnchorElement.prototype.click = anchorClickSpy as unknown as () => void
        URL.createObjectURL = vi.fn(() => 'blob:fake-url') as unknown as typeof URL.createObjectURL
        URL.revokeObjectURL = vi.fn()

        await wrapper.find('[data-testid="download-wav"]').trigger('click')

        const anchor = anchorClickSpy.mock.instances[0] as unknown as HTMLAnchorElement
        expect(anchor.download).toBe('test_pitch+3.wav')
    })

    it('다른 파일 선택을 누르면 원본과 결과가 초기화되어 업로드 화면으로 돌아간다', async () => {
        const wrapper = mount(AudioPitchTool)
        await uploadFile(wrapper)
        await wrapper.find('[data-testid="apply-pitch"]').trigger('click')
        await flushPromises()

        await wrapper.findAll('button').find(b => b.text() === '다른 파일 선택')!.trigger('click')

        expect(wrapper.find('[data-testid="tool-panel"]').exists()).toBe(false)
        expect(wrapper.find('[data-testid="download-wav"]').exists()).toBe(false)
    })
})
