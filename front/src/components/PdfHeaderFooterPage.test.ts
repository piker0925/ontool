import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {mount} from '@vue/test-utils'
import PdfHeaderFooterPage from './PdfHeaderFooterPage.vue'
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
    return mount(PdfHeaderFooterPage, {global: {stubs: {FileUploader: true}}})
}

function uploaderProps(wrapper: ReturnType<typeof mountPage>) {
    return wrapper.findComponent(FileUploader).props()
}

function inputForPlaceholder(wrapper: ReturnType<typeof mountPage>, placeholder: string) {
    return wrapper.findAll('input').find(i => i.attributes('placeholder') === placeholder)!
}

beforeEach(() => {
    vi.clearAllMocks()
    MockEventSource.instances = []
    vi.stubGlobal('EventSource', MockEventSource)
})

afterEach(() => {
    vi.unstubAllGlobals()
})

describe('PdfHeaderFooterPage', () => {
    it('기본 params는 세 필드 모두 빈 문자열이고 moduleId는 pdf-header-footer다', () => {
        const wrapper = mountPage()
        expect(uploaderProps(wrapper).params).toEqual({headerText: '', footerText: '', pageNumberFormat: ''})
        expect(uploaderProps(wrapper).moduleId).toBe('pdf-header-footer')
    })

    it('헤더·푸터·페이지번호 형식을 입력하면 params에 반영된다', async () => {
        const wrapper = mountPage()
        await inputForPlaceholder(wrapper, '예: 회사명').setValue('OnTool 주식회사')
        await inputForPlaceholder(wrapper, '예: 대외비').setValue('대외비')
        await inputForPlaceholder(wrapper, '예: {page} / {total}').setValue('{page}/{total}')

        expect(uploaderProps(wrapper).params).toEqual({
            headerText: 'OnTool 주식회사', footerText: '대외비', pageNumberFormat: '{page}/{total}',
        })
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
        await wrapper.findComponent(FileUploader).vm.$emit('error', '헤더/푸터/페이지 번호 중 하나는 필요합니다')
        const panel = wrapper.findComponent(HeavyJobStatusPanel)
        expect(panel.props('uploadError')).toBe('헤더/푸터/페이지 번호 중 하나는 필요합니다')
    })
})
