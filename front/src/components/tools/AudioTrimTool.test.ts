import {describe, expect, it, beforeEach, afterEach} from 'vitest'
import {flushPromises, mount} from '@vue/test-utils'
import AudioTrimTool from './AudioTrimTool.vue'
import {installFakeAudioContext, uninstallFakeAudioContext, uploadFile} from '../../test/audioComponentFixtures'

beforeEach(installFakeAudioContext)
afterEach(uninstallFakeAudioContext)

describe('AudioTrimTool', () => {
    it('파일 업로드 전에는 처리 도구 패널이 보이지 않는다', () => {
        const wrapper = mount(AudioTrimTool)
        expect(wrapper.find('[data-testid="tool-panel"]').exists()).toBe(false)
    })

    it('업로드하면 원본 파형/재생 컨트롤과 도구 패널이 나타난다', async () => {
        const wrapper = mount(AudioTrimTool)
        await uploadFile(wrapper)

        expect(wrapper.find('[data-testid="tool-panel"]').exists()).toBe(true)
        expect(wrapper.findAll('canvas').length).toBeGreaterThan(0)
        expect(wrapper.findAll('[data-testid="play-pause-button"]').length).toBeGreaterThan(0)
    })

    it('시작/끝 초를 지정하고 적용하면 결과 파형과 다운로드 버튼이 나타난다', async () => {
        const wrapper = mount(AudioTrimTool)
        await uploadFile(wrapper)

        await wrapper.find('[data-testid="trim-start-input"]').setValue(0.1)
        await wrapper.find('[data-testid="trim-start-input"]').trigger('change')
        await wrapper.find('[data-testid="trim-end-input"]').setValue(0.2)
        await wrapper.find('[data-testid="trim-end-input"]').trigger('change')
        await wrapper.find('[data-testid="apply-trim"]').trigger('click')
        await flushPromises()

        expect(wrapper.find('[data-testid="download-wav"]').exists()).toBe(true)
        expect(wrapper.find('[data-testid="download-mp3"]').exists()).toBe(true)
    })
})
