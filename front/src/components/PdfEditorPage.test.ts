import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {flushPromises, mount} from '@vue/test-utils'
import {createMemoryHistory, createRouter} from 'vue-router'
import PdfEditorPage from './PdfEditorPage.vue'
import FileUploader from './FileUploader.vue'
import HeavyJobStatusPanel from './HeavyJobStatusPanel.vue'
import WatermarkEditorCanvas from './WatermarkEditorCanvas.vue'
import {apiClient} from '../api/client'

vi.mock('../api/client', () => ({
    apiClient: {get: vi.fn(), post: vi.fn()},
}))

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

async function mountWithQuery(query: string) {
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [{path: '/tools/pdf-editor', component: PdfEditorPage}],
    })
    router.push('/tools/pdf-editor' + query)
    await router.isReady()
    return mount(PdfEditorPage, {global: {plugins: [router], stubs: {FileUploader: true, WatermarkEditorCanvas: true}}})
}

function uploaderProps(wrapper: Awaited<ReturnType<typeof mountWithQuery>>) {
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

describe('PdfEditorPage', () => {
    it('쿼리 없이 진입하면 기본 모드(워터마크)가 열리고 나머지 모드 필드는 빈 채로 채워진다', async () => {
        const wrapper = await mountWithQuery('')
        const params = uploaderProps(wrapper).params
        expect(params).toEqual({
            textElements: '[]', position: 'CENTER', opacity: '30',
            mode: '', password: '', headerText: '', footerText: '', pageNumberFormat: '',
        })
        expect(uploaderProps(wrapper).moduleId).toBe('pdf-watermark')
    })

    it('?mode=password 쿼리로 진입하면 비밀번호 모드가 바로 열린다(딥링크)', async () => {
        const wrapper = await mountWithQuery('?mode=password')
        expect(uploaderProps(wrapper).moduleId).toBe('pdf-password')
    })

    it('알 수 없는 mode 쿼리는 무시하고 기본 모드로 진입한다', async () => {
        const wrapper = await mountWithQuery('?mode=nonexistent')
        expect(uploaderProps(wrapper).moduleId).toBe('pdf-watermark')
    })

    it('비밀번호 입력란은 기본적으로 마스킹되고, 표시 버튼을 누르면 평문으로 전환된다', async () => {
        const wrapper = await mountWithQuery('?mode=password')
        const passwordInput = wrapper.find('input[placeholder="비밀번호 입력"]')
        expect(passwordInput.attributes('type')).toBe('password')

        await wrapper.find('button[aria-label="비밀번호 표시"]').trigger('click')
        expect(passwordInput.attributes('type')).toBe('text')

        await wrapper.find('button[aria-label="비밀번호 숨기기"]').trigger('click')
        expect(passwordInput.attributes('type')).toBe('password')
    })

    it('워터마크 편집기가 요소를 갱신하면 FileUploader에 textElements JSON으로 전달된다', async () => {
        const wrapper = await mountWithQuery('')
        const elements = [
            {id: 'el-0', text: 'SECRET', xPercent: 40, yPercent: 40, color: '#ff0000', fontSize: 30, page: null, fontWeight: 'REGULAR'},
        ]
        await wrapper.findComponent(WatermarkEditorCanvas).vm.$emit('update:elements', elements)

        const params = uploaderProps(wrapper).params
        // id는 프론트 전용 key라 백엔드로 보내는 JSON에서는 빠진다.
        expect(JSON.parse(params!.textElements)).toEqual([
            {text: 'SECRET', xPercent: 40, yPercent: 40, color: '#ff0000', fontSize: 30, page: null, fontWeight: 'REGULAR'},
        ])
    })

    it('업로드 전 스테이징된 파일이 바뀌면 워터마크 편집기의 파일 props도 갱신된다', async () => {
        const wrapper = await mountWithQuery('')
        const file = new File(['x'], 'target.pdf', {type: 'application/pdf'})
        await wrapper.findComponent(FileUploader).vm.$emit('staged', [file])

        expect(wrapper.findComponent(WatermarkEditorCanvas).props('file')).toBe(file)
    })

    it('스테이징 파일이 바뀌면(교체) 이전에 잡아둔 워터마크 요소가 초기화된다', async () => {
        const wrapper = await mountWithQuery('')
        const elements = [{id: 'el-0', text: 'X', xPercent: 10, yPercent: 10, color: '#000000', fontSize: 24, page: null, fontWeight: 'REGULAR'}]
        await wrapper.findComponent(WatermarkEditorCanvas).vm.$emit('update:elements', elements)
        expect(JSON.parse(uploaderProps(wrapper).params!.textElements)).toHaveLength(1)

        const file = new File(['x'], 'target.pdf', {type: 'application/pdf'})
        await wrapper.findComponent(FileUploader).vm.$emit('staged', [file])

        expect(JSON.parse(uploaderProps(wrapper).params!.textElements)).toHaveLength(0)
    })

    it('모드를 password로 바꾸면 currentParams가 password 모드 필드로 전환되고 워터마크 필드는 비워진다', async () => {
        const wrapper = await mountWithQuery('')
        await wrapper.find('select').setValue('password')
        const params = uploaderProps(wrapper).params
        expect(params).toEqual({
            textElements: '', position: '', opacity: '',
            mode: 'SET', password: '', headerText: '', footerText: '', pageNumberFormat: '',
        })
    })

    it('모드를 바꾸면 URL 쿼리도 함께 갱신된다', async () => {
        const wrapper = await mountWithQuery('')
        await wrapper.find('select').setValue('header-footer')
        await flushPromises()
        const router = wrapper.vm.$router
        expect(router.currentRoute.value.query.mode).toBe('header-footer')
    })

    it('업로드 성공 시(단건 job) HeavyJobStatusPanel에 jobId가 전달된다', async () => {
        const wrapper = await mountWithQuery('')
        await wrapper.findComponent(FileUploader).vm.$emit('uploaded', {jobId: 'job-1'})
        const panel = wrapper.findComponent(HeavyJobStatusPanel)
        expect(panel.props('jobId')).toBe('job-1')
        expect(MockEventSource.instances).toHaveLength(1)
    })

    it('업로드 실패 시 에러 메시지가 HeavyJobStatusPanel로 전달된다', async () => {
        const wrapper = await mountWithQuery('')
        await wrapper.findComponent(FileUploader).vm.$emit('error', '파일이 너무 큽니다')
        const panel = wrapper.findComponent(HeavyJobStatusPanel)
        expect(panel.props('uploadError')).toBe('파일이 너무 큽니다')
    })

    it('업로드 후 모드를 바꾸면 진행 중이던 job 상태가 초기화된다', async () => {
        const wrapper = await mountWithQuery('')
        await wrapper.findComponent(FileUploader).vm.$emit('uploaded', {jobId: 'job-1'})
        expect(wrapper.findComponent(HeavyJobStatusPanel).props('jobId')).toBe('job-1')

        await wrapper.find('select').setValue('password')
        expect(wrapper.findComponent(HeavyJobStatusPanel).props('jobId')).toBeNull()
    })
})
