import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {mount} from '@vue/test-utils'
import PdfWatermarkPage from './PdfWatermarkPage.vue'
import FileUploader from './FileUploader.vue'
import HeavyJobStatusPanel from './HeavyJobStatusPanel.vue'
import WatermarkEditorCanvas from './WatermarkEditorCanvas.vue'

// jsdom엔 EventSource가 없다 — 업로드 후 heavyJob.track()이 실제 EventSource를 생성하므로 필요.
class MockEventSource {
    static instances: MockEventSource[] = []
    readyState = 1
    onerror: ((e: Event) => void) | null = null
    url: string

    constructor(url: string) {
        this.url = url
        MockEventSource.instances.push(this)
    }

    addEventListener() {
    }

    close() {
    }
}

function mountPage() {
    return mount(PdfWatermarkPage, {global: {stubs: {FileUploader: true, WatermarkEditorCanvas: true}}})
}

function uploaderProps(wrapper: ReturnType<typeof mountPage>) {
    return wrapper.findComponent(FileUploader).props()
}

beforeEach(() => {
    vi.clearAllMocks()
    MockEventSource.instances = []
    vi.stubGlobal('EventSource', MockEventSource)
})

afterEach(() => {
    vi.unstubAllGlobals()
})

describe('PdfWatermarkPage', () => {
    it('기본 params는 textElements 빈 배열·기본 위치/투명도로 채워진다', () => {
        const wrapper = mountPage()
        const params = uploaderProps(wrapper).params
        expect(params).toEqual({textElements: '[]', position: 'CENTER', opacity: '30'})
        expect(uploaderProps(wrapper).moduleId).toBe('pdf-watermark')
    })

    it('워터마크 편집기가 요소를 갱신하면 FileUploader에 textElements JSON으로 전달된다', async () => {
        const wrapper = mountPage()
        const elements = [
            {id: 'el-0', text: 'SECRET', xPercent: 40, yPercent: 40, color: '#ff0000', fontSize: 30, page: null, fontWeight: 'REGULAR', tiled: false},
        ]
        await wrapper.findComponent(WatermarkEditorCanvas).vm.$emit('update:elements', elements)

        const params = uploaderProps(wrapper).params
        expect(JSON.parse(params!.textElements)).toEqual([
            {text: 'SECRET', xPercent: 40, yPercent: 40, color: '#ff0000', fontSize: 30, page: null, fontWeight: 'REGULAR', tiled: false},
        ])
    })

    it('업로드 전 스테이징된 파일이 바뀌면 워터마크 편집기의 파일 props도 갱신된다', async () => {
        const wrapper = mountPage()
        const file = new File(['x'], 'target.pdf', {type: 'application/pdf'})
        await wrapper.findComponent(FileUploader).vm.$emit('staged', [file])

        expect(wrapper.findComponent(WatermarkEditorCanvas).props('file')).toBe(file)
    })

    it('스테이징 파일이 바뀌면(교체) 이전에 잡아둔 워터마크 요소가 초기화된다', async () => {
        const wrapper = mountPage()
        const elements = [{id: 'el-0', text: 'X', xPercent: 10, yPercent: 10, color: '#000000', fontSize: 24, page: null, fontWeight: 'REGULAR', tiled: false}]
        await wrapper.findComponent(WatermarkEditorCanvas).vm.$emit('update:elements', elements)
        expect(JSON.parse(uploaderProps(wrapper).params!.textElements)).toHaveLength(1)

        const file = new File(['x'], 'target.pdf', {type: 'application/pdf'})
        await wrapper.findComponent(FileUploader).vm.$emit('staged', [file])

        expect(JSON.parse(uploaderProps(wrapper).params!.textElements)).toHaveLength(0)
    })

    it('업로드 성공 시(단건 job) HeavyJobStatusPanel에 jobId가 전달된다', async () => {
        const wrapper = mountPage()
        await wrapper.findComponent(FileUploader).vm.$emit('uploaded', {jobId: 'job-1'})
        const panel = wrapper.findComponent(HeavyJobStatusPanel)
        expect(panel.props('jobId')).toBe('job-1')
        // 043: 이 페이지 자신의 실시간 표시용 연결 1개 + 전역 "내 작업" 추적 store용 백그라운드
        // 연결 1개, 총 2개 — 페이지를 벗어나도 추적이 끊기지 않도록 하는 의도된 트레이드오프.
        expect(MockEventSource.instances).toHaveLength(2)
    })

    it('업로드 실패 시 에러 메시지가 HeavyJobStatusPanel로 전달된다', async () => {
        const wrapper = mountPage()
        await wrapper.findComponent(FileUploader).vm.$emit('error', '파일이 너무 큽니다')
        const panel = wrapper.findComponent(HeavyJobStatusPanel)
        expect(panel.props('uploadError')).toBe('파일이 너무 큽니다')
    })
})
