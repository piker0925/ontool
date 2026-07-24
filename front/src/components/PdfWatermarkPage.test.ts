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
    it('워터마크 이미지를 올리기 전 기본 params는 textElements 빈 배열·기본 투명도만 채워지고 이미지 위치 파라미터는 아직 없다(129)', () => {
        const wrapper = mountPage()
        const params = uploaderProps(wrapper).params
        expect(params).toEqual({textElements: '[]', opacity: '30'})
        expect(uploaderProps(wrapper).moduleId).toBe('pdf-watermark')
    })

    it('워터마크 이미지 편집기가 위치를 갱신하면 FileUploader에 imageXPercent/imageYPercent로 전달된다(129)', async () => {
        const wrapper = mountPage()
        await wrapper.findComponent(WatermarkEditorCanvas).vm.$emit('update:imagePosition', {xPercent: 77, yPercent: 88})

        const params = uploaderProps(wrapper).params
        expect(params!.imageXPercent).toBe('77')
        expect(params!.imageYPercent).toBe('88')
    })

    it('두 번째 슬롯에 스테이징된 워터마크 이미지 파일이 편집기의 watermarkImageFile prop으로 전달된다(129)', async () => {
        const wrapper = mountPage()
        const target = new File(['x'], 'target.pdf', {type: 'application/pdf'})
        const wmImage = new File(['x'], 'wm.png', {type: 'image/png'})
        await wrapper.findComponent(FileUploader).vm.$emit('staged', [target, wmImage])

        expect(wrapper.findComponent(WatermarkEditorCanvas).props('watermarkImageFile')).toBe(wmImage)
    })

    it('워터마크 이미지 파일이 바뀌면(교체) 이전에 잡아둔 이미지 위치가 초기화된다(129)', async () => {
        const wrapper = mountPage()
        const target = new File(['x'], 'target.pdf', {type: 'application/pdf'})
        const wmImage1 = new File(['x'], 'wm1.png', {type: 'image/png'})
        await wrapper.findComponent(FileUploader).vm.$emit('staged', [target, wmImage1])
        await wrapper.findComponent(WatermarkEditorCanvas).vm.$emit('update:imagePosition', {xPercent: 10, yPercent: 10})
        expect(uploaderProps(wrapper).params!.imageXPercent).toBe('10')

        const wmImage2 = new File(['x'], 'wm2.png', {type: 'image/png'})
        await wrapper.findComponent(FileUploader).vm.$emit('staged', [target, wmImage2])

        expect(uploaderProps(wrapper).params!.imageXPercent).toBeUndefined()
    })

    // 113: 대상 PDF를 여러 개 한 번에 선택할 수 없어야 한다(회귀 재현: 대상 3개 + 워터마크
    // 이미지 1개 = 총 4개가 그대로 한 Job으로 넘어가 백엔드가 거부하던 버그).
    it('FileUploader에 multiple=false·maxFiles=2·전용 두 번째 슬롯 설정이 전달된다', () => {
        const wrapper = mountPage()
        const props = uploaderProps(wrapper)
        expect(props.multiple).toBe(false)
        expect(props.maxFiles).toBe(2)
        // 113 확장: 순서 기반 암묵 규칙을 명시적인 두 번째 슬롯 버튼으로 대체했으므로, 이제 순서는
        // 구조적으로 고정된다(대상=0번, 이미지=1번) — 수동 순서 조정 UI는 더 이상 필요 없다.
        expect(props.reorderable).toBe(false)
        expect(props.secondSlotLabel).toContain('이미지 워터마크')
        expect(props.secondSlotAccept).toBe('.jpg,.jpeg,.png')
    })

    it('대상 파일이 1개로 제한된다는 안내 문구가 노출된다', () => {
        const wrapper = mountPage()
        expect(wrapper.text()).toContain('대상 파일은 1개만')
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
