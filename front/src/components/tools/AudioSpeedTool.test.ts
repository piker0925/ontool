import {describe, expect, it, beforeEach, afterEach} from 'vitest'
import {flushPromises, mount} from '@vue/test-utils'
import AudioSpeedTool from './AudioSpeedTool.vue'
import {installFakeAudioContext, uninstallFakeAudioContext, uploadFile} from '../../test/audioComponentFixtures'

beforeEach(installFakeAudioContext)
afterEach(uninstallFakeAudioContext)

describe('AudioSpeedTool', () => {
    it('파일 업로드 전에는 처리 도구 패널이 보이지 않는다', () => {
        const wrapper = mount(AudioSpeedTool)
        expect(wrapper.find('[data-testid="tool-panel"]').exists()).toBe(false)
    })

    it('업로드하면 원본 파형/재생 컨트롤과 도구 패널이 나타난다', async () => {
        const wrapper = mount(AudioSpeedTool)
        await uploadFile(wrapper)

        expect(wrapper.find('[data-testid="tool-panel"]').exists()).toBe(true)
        expect(wrapper.findAll('canvas').length).toBeGreaterThan(0)
        expect(wrapper.findAll('[data-testid="play-pause-button"]').length).toBeGreaterThan(0)
    })

    it('배속 값을 지정하고 적용하면 결과가 나타난다', async () => {
        const wrapper = mount(AudioSpeedTool)
        await uploadFile(wrapper)

        await wrapper.find('[data-testid="speed-rate-input"]').setValue(1.5)
        await wrapper.find('[data-testid="apply-speed"]').trigger('click')
        await flushPromises()

        expect(wrapper.find('[data-testid="download-wav"]').exists()).toBe(true)
    })

    it('피치 유지 체크박스를 끄고 적용해도 결과가 나타난다', async () => {
        const wrapper = mount(AudioSpeedTool)
        await uploadFile(wrapper)

        await wrapper.find('[data-testid="speed-preserve-pitch"]').setValue(false)
        await wrapper.find('[data-testid="apply-speed"]').trigger('click')
        await flushPromises()

        expect(wrapper.find('[data-testid="download-wav"]').exists()).toBe(true)
    })
})
