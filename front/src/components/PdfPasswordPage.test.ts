import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {mount} from '@vue/test-utils'
import PdfPasswordPage from './PdfPasswordPage.vue'
import FileUploader from './FileUploader.vue'
import HeavyJobStatusPanel from './HeavyJobStatusPanel.vue'

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
    return mount(PdfPasswordPage, {global: {stubs: {FileUploader: true}}})
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

describe('PdfPasswordPage', () => {
    it('기본 params는 mode=SET·빈 비밀번호로 채워지고 moduleId는 pdf-password다', () => {
        const wrapper = mountPage()
        expect(uploaderProps(wrapper).params).toEqual({mode: 'SET', password: ''})
        expect(uploaderProps(wrapper).moduleId).toBe('pdf-password')
    })

    it('비밀번호 입력란은 기본적으로 마스킹되고, 표시 버튼을 누르면 평문으로 전환된다', async () => {
        const wrapper = mountPage()
        const passwordInput = wrapper.find('input[placeholder="비밀번호 입력"]')
        expect(passwordInput.attributes('type')).toBe('password')

        await wrapper.find('button[aria-label="비밀번호 표시"]').trigger('click')
        expect(passwordInput.attributes('type')).toBe('text')

        await wrapper.find('button[aria-label="비밀번호 숨기기"]').trigger('click')
        expect(passwordInput.attributes('type')).toBe('password')
    })

    it('동작을 REMOVE로 바꾸고 비밀번호를 입력하면 params에 반영된다', async () => {
        const wrapper = mountPage()
        await wrapper.find('select').setValue('REMOVE')
        await wrapper.find('input[placeholder="비밀번호 입력"]').setValue('secret123')

        expect(uploaderProps(wrapper).params).toEqual({mode: 'REMOVE', password: 'secret123'})
    })

    it('업로드 성공 시(단건 job) HeavyJobStatusPanel에 jobId가 전달된다', async () => {
        const wrapper = mountPage()
        await wrapper.findComponent(FileUploader).vm.$emit('uploaded', {jobId: 'job-1'})
        const panel = wrapper.findComponent(HeavyJobStatusPanel)
        expect(panel.props('jobId')).toBe('job-1')
        expect(MockEventSource.instances).toHaveLength(1)
    })

    it('업로드 실패 시 에러 메시지가 HeavyJobStatusPanel로 전달된다', async () => {
        const wrapper = mountPage()
        await wrapper.findComponent(FileUploader).vm.$emit('error', '비밀번호가 올바르지 않습니다')
        const panel = wrapper.findComponent(HeavyJobStatusPanel)
        expect(panel.props('uploadError')).toBe('비밀번호가 올바르지 않습니다')
    })
})
