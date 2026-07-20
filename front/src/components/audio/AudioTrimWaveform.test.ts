import {describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import AudioTrimWaveform from './AudioTrimWaveform.vue'
import type {PcmAudio} from '../../utils/audioTypes'
import {generateSineWave} from '../../test/audioTestHelpers'

// wavesurfer.js는 실제 DOM/오디오 디코딩이 필요한 브라우저 전용 라이브러리라 jsdom에서
// 의미 있게 검증할 수 없다(컴포넌트 내부에서 초기화 실패를 조용히 흡수하도록 만들어뒀다).
// 여기서는 숫자 입력 기반 트리밍 흐름(실제 드래그와 동등한 대체 조작 경로)만 검증하고,
// 파형 드래그 선택 자체는 최종 브라우저 검증 단계에서 확인한다.
function makePcm(): PcmAudio {
    return {interleaved: generateSineWave(440, 10, 44100, 0.5, 2), sampleRate: 44100, channels: 2}
}

describe('AudioTrimWaveform', () => {
    it('마운트 시 시작 0초 · 끝 오디오 전체 길이로 change 이벤트를 emit한다', () => {
        const wrapper = mount(AudioTrimWaveform, {props: {pcm: makePcm()}})

        const emitted = wrapper.emitted('change')
        expect(emitted).toBeTruthy()
        expect(emitted![0][0]).toEqual({start: 0, end: 10})
    })

    it('시작/끝 입력을 바꾸면 change 이벤트로 새 선택 구간을 emit한다', async () => {
        const wrapper = mount(AudioTrimWaveform, {props: {pcm: makePcm()}})

        await wrapper.find('[data-testid="trim-start-input"]').setValue(3)
        await wrapper.find('[data-testid="trim-start-input"]').trigger('change')
        await wrapper.find('[data-testid="trim-end-input"]').setValue(7)
        await wrapper.find('[data-testid="trim-end-input"]').trigger('change')

        const emitted = wrapper.emitted('change')!
        const last = emitted[emitted.length - 1][0] as {start: number, end: number}
        expect(last).toEqual({start: 3, end: 7})
    })

    it('끝이 시작보다 작아지지 않도록 보정한다', async () => {
        const wrapper = mount(AudioTrimWaveform, {props: {pcm: makePcm()}})

        await wrapper.find('[data-testid="trim-start-input"]').setValue(8)
        await wrapper.find('[data-testid="trim-start-input"]').trigger('change')
        await wrapper.find('[data-testid="trim-end-input"]').setValue(2)
        await wrapper.find('[data-testid="trim-end-input"]').trigger('change')

        const emitted = wrapper.emitted('change')!
        const last = emitted[emitted.length - 1][0] as {start: number, end: number}
        expect(last.end).toBeGreaterThanOrEqual(last.start)
    })
})
