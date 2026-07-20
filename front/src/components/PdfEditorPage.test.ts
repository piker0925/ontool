import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {flushPromises, mount} from '@vue/test-utils'
import {createMemoryHistory, createRouter} from 'vue-router'
import PdfEditorPage from './PdfEditorPage.vue'
import FileUploader from './FileUploader.vue'
import HeavyJobStatusPanel from './HeavyJobStatusPanel.vue'

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
    return mount(PdfEditorPage, {global: {plugins: [router], stubs: {FileUploader: true}}})
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
            text: '', position: 'CENTER', opacity: '30',
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

    it('워터마크 텍스트를 입력하면 FileUploader에 넘어가는 params가 갱신된다', async () => {
        const wrapper = await mountWithQuery('')
        const input = wrapper.find('input[placeholder="예: CONFIDENTIAL"]')
        await input.setValue('SECRET')
        expect(uploaderProps(wrapper).params?.text).toBe('SECRET')
    })

    it('모드를 password로 바꾸면 currentParams가 password 모드 필드로 전환되고 워터마크 필드는 비워진다', async () => {
        const wrapper = await mountWithQuery('')
        await wrapper.find('select').setValue('password')
        const params = uploaderProps(wrapper).params
        expect(params).toEqual({
            text: '', position: '', opacity: '',
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
