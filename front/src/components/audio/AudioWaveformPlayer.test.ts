import {describe, expect, it, beforeEach, afterEach} from 'vitest'
import {mount} from '@vue/test-utils'
import AudioWaveformPlayer from './AudioWaveformPlayer.vue'
import type {PcmAudio} from '../../utils/audioTypes'

// jsdom엔 AudioContext/재생 파이프라인이 없으므로, 실제 재생 여부 자체는 최종 브라우저
// 검증에서 확인한다. 여기서는 컴포넌트가 재생 API를 "올바른 인자로" 호출하고 재생 상태
// (isPlaying) 토글을 올바르게 관리하는지만 검증한다.
class FakeSourceNode {
    buffer: unknown = null
    onended: (() => void) | null = null
    started = false
    stopped = false
    startArgs: number[] = []
    connect() { /* no-op */ }
    start(...args: number[]) {
        this.started = true
        this.startArgs = args
    }
    stop() {
        this.stopped = true
        this.onended?.()
    }
}

class FakeAudioContext {
    destination = {}
    lastSource: FakeSourceNode | null = null
    // 재생 위치 추적(currentPlaybackSeconds)이 audioContext.currentTime을 읽으므로 테스트에서도
    // 값을 갖고 있어야 한다 — 실제 시간 흐름을 검증하는 테스트가 아니므로 고정값(0)이면 충분하다.
    currentTime = 0
    createBuffer(channels: number, length: number, sampleRate: number) {
        return {numberOfChannels: channels, length, sampleRate, copyToChannel: () => {}, getChannelData: () => new Float32Array(length)}
    }
    createBufferSource() {
        const source = new FakeSourceNode()
        this.lastSource = source
        return source
    }
    close() {
        return Promise.resolve()
    }
}

let fakeCtx: FakeAudioContext

beforeEach(() => {
    fakeCtx = new FakeAudioContext()
    // @ts-expect-error 테스트 환경 전역 스텁
    window.AudioContext = function () { return fakeCtx }
})
afterEach(() => {
    // @ts-expect-error 테스트 환경 전역 스텁 정리
    delete window.AudioContext
})

function makePcm(): PcmAudio {
    return {interleaved: new Float32Array([0, 0.5, 0.2, -0.3, 0.1, 0.1]), sampleRate: 44100, channels: 2}
}

// jsdom은 실제 레이아웃을 계산하지 않아 canvas.getBoundingClientRect()/clientWidth가 항상
// 0이다 — 클릭의 x좌표→시각 변환이 의미 있게 동작하려면 캔버스 너비를 직접 스텁해야 한다.
function stubCanvasWidth(canvas: Element, width: number) {
    Object.defineProperty(canvas, 'clientWidth', {value: width, configurable: true})
    canvas.getBoundingClientRect = () => ({
        x: 0, y: 0, left: 0, top: 0, right: width, bottom: 64, width, height: 64,
        toJSON: () => {},
    })
}

// makePcm()은 몇 프레임짜리라 전체 길이가 아주 짧다 — 클릭 위치→시각 변환을 의미 있게
// 검증하려면 실제로 길이가 있는(10초) PCM이 필요하다.
function makeLongPcm(): PcmAudio {
    const sampleRate = 1000
    const frames = 10 * sampleRate
    return {interleaved: new Float32Array(frames * 2).fill(0.3), sampleRate, channels: 2}
}

describe('AudioWaveformPlayer', () => {
    it('재생 버튼을 누르면 오디오 소스를 생성해 start()를 호출하고 재생 중 상태로 바뀐다', async () => {
        const wrapper = mount(AudioWaveformPlayer, {props: {pcm: makePcm()}})

        expect(wrapper.find('[data-testid="play-pause-button"]').text()).toContain('재생')

        await wrapper.find('[data-testid="play-pause-button"]').trigger('click')
        await wrapper.vm.$nextTick()

        expect(fakeCtx.lastSource?.started).toBe(true)
        expect(wrapper.find('[data-testid="play-pause-button"]').text()).toContain('일시정지')
    })

    it('재생 중 다시 누르면 정지하고 버튼 문구가 재생으로 돌아온다', async () => {
        const wrapper = mount(AudioWaveformPlayer, {props: {pcm: makePcm()}})

        await wrapper.find('[data-testid="play-pause-button"]').trigger('click')
        await wrapper.vm.$nextTick()
        await wrapper.find('[data-testid="play-pause-button"]').trigger('click')
        await wrapper.vm.$nextTick()

        expect(fakeCtx.lastSource?.stopped).toBe(true)
        expect(wrapper.find('[data-testid="play-pause-button"]').text()).toContain('재생')
    })

    it('재생이 자연스럽게 끝나면(onended) 버튼이 재생 상태로 돌아온다', async () => {
        const wrapper = mount(AudioWaveformPlayer, {props: {pcm: makePcm()}})

        await wrapper.find('[data-testid="play-pause-button"]').trigger('click')
        await wrapper.vm.$nextTick()

        fakeCtx.lastSource?.onended?.()
        await wrapper.vm.$nextTick()

        expect(wrapper.find('[data-testid="play-pause-button"]').text()).toContain('재생')
    })

    it('label prop을 전달하면 표시한다', () => {
        const wrapper = mount(AudioWaveformPlayer, {props: {pcm: makePcm(), label: '원본'}})
        expect(wrapper.text()).toContain('원본')
    })

    it('파형을 그리는 canvas 엘리먼트를 렌더링한다', () => {
        const wrapper = mount(AudioWaveformPlayer, {props: {pcm: makePcm()}})
        expect(wrapper.find('canvas').exists()).toBe(true)
    })

    describe('클릭-탐색(click-to-seek)', () => {
        it('멈춰 있을 때 파형을 클릭하면 그 위치(초)를 오프셋으로 재생을 시작한다', async () => {
            const wrapper = mount(AudioWaveformPlayer, {props: {pcm: makeLongPcm()}})
            stubCanvasWidth(wrapper.find('canvas').element, 300)

            // 10초 길이, 캔버스 300px → 150px는 5초 지점
            await wrapper.find('canvas').trigger('click', {clientX: 150})
            await wrapper.vm.$nextTick()

            expect(fakeCtx.lastSource?.started).toBe(true)
            expect(fakeCtx.lastSource?.startArgs[1]).toBeCloseTo(5, 5)
            expect(wrapper.find('[data-testid="play-pause-button"]').text()).toContain('일시정지')
        })

        it('재생 중에 다른 위치를 클릭하면 이전 소스를 정지하고 새 위치부터 이어서 재생한다', async () => {
            const wrapper = mount(AudioWaveformPlayer, {props: {pcm: makeLongPcm()}})
            stubCanvasWidth(wrapper.find('canvas').element, 300)

            await wrapper.find('[data-testid="play-pause-button"]').trigger('click') // 0초부터 재생
            await wrapper.vm.$nextTick()
            const firstSource = fakeCtx.lastSource!

            await wrapper.find('canvas').trigger('click', {clientX: 210}) // 7초 지점
            await wrapper.vm.$nextTick()

            expect(firstSource.stopped).toBe(true)
            expect(fakeCtx.lastSource).not.toBe(firstSource)
            expect(fakeCtx.lastSource?.startArgs[1]).toBeCloseTo(7, 5)
            expect(wrapper.find('[data-testid="play-pause-button"]').text()).toContain('일시정지')
        })

        it('캔버스 범위를 벗어난 클릭도 0~전체 길이 범위로 클램프된 오프셋을 사용한다', async () => {
            const wrapper = mount(AudioWaveformPlayer, {props: {pcm: makeLongPcm()}})
            stubCanvasWidth(wrapper.find('canvas').element, 300)

            await wrapper.find('canvas').trigger('click', {clientX: 9000})
            await wrapper.vm.$nextTick()

            expect(fakeCtx.lastSource?.startArgs[1]).toBeCloseTo(10, 5)
        })
    })
})
