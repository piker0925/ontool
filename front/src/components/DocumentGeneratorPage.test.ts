import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {flushPromises, mount} from '@vue/test-utils'
import DocumentGeneratorPage from './DocumentGeneratorPage.vue'
import HeavyJobStatusPanel from './HeavyJobStatusPanel.vue'
import {apiClient} from '../api/client'
import {todayDateString} from '../utils/todayDateString'

vi.mock('../api/client', () => ({
    apiClient: {get: vi.fn(), post: vi.fn()},
}))

const mockPost = apiClient.post as ReturnType<typeof vi.fn>

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
    return mount(DocumentGeneratorPage)
}

function inputByPlaceholder(wrapper: ReturnType<typeof mountPage>, placeholder: string) {
    const input = wrapper.findAll('input').find(i => i.attributes('placeholder') === placeholder)
    if (!input) throw new Error(`input not found: placeholder=${placeholder}`)
    return input
}

async function fillMinimumValidInvoice(wrapper: ReturnType<typeof mountPage>) {
    await inputByPlaceholder(wrapper, '발행자명').setValue('발행사')
    await inputByPlaceholder(wrapper, '수신자명').setValue('수신사')
    await inputByPlaceholder(wrapper, '품목명').setValue('컨설팅')
    await inputByPlaceholder(wrapper, '수량').setValue('1')
    await inputByPlaceholder(wrapper, '단가').setValue('100000')
}

beforeEach(() => {
    vi.clearAllMocks()
    MockEventSource.instances = []
    vi.stubGlobal('EventSource', MockEventSource)
})

afterEach(() => {
    vi.unstubAllGlobals()
})

describe('DocumentGeneratorPage', () => {
    it('발행자·수신자·완전한 품목이 없으면 생성 버튼이 비활성화된다', () => {
        const wrapper = mountPage()
        expect(wrapper.find('button:not([type="button"])').attributes('disabled')).toBeDefined()
    })

    it('품목의 수량·단가가 비어 있으면 완전한 품목이 없는 것으로 보고 버튼을 막는다', async () => {
        const wrapper = mountPage()
        await inputByPlaceholder(wrapper, '발행자명').setValue('발행사')
        await inputByPlaceholder(wrapper, '수신자명').setValue('수신사')
        await inputByPlaceholder(wrapper, '품목명').setValue('컨설팅')
        expect(wrapper.find('button:not([type="button"])').attributes('disabled')).toBeDefined()
    })

    it('발행자·수신자·완전한 품목 하나가 채워지면 버튼이 활성화된다', async () => {
        const wrapper = mountPage()
        await fillMinimumValidInvoice(wrapper)
        expect(wrapper.find('button:not([type="button"])').attributes('disabled')).toBeUndefined()
    })

    it('+ 품목 추가를 누르면 입력 행이 늘어나고, 남은 행이 하나뿐이면 삭제 버튼이 비활성화된다', async () => {
        const wrapper = mountPage()
        const addButton = wrapper.findAll('button').find(b => b.text().includes('품목 추가'))!
        const deleteButtonOf = (i: number) => wrapper.findAll('button').filter(b => !b.text().trim())[i]

        expect(deleteButtonOf(0).attributes('disabled')).toBeDefined()
        await addButton.trigger('click')
        expect(wrapper.findAll('input').filter(i => i.attributes('placeholder') === '품목명')).toHaveLength(2)
        expect(deleteButtonOf(0).attributes('disabled')).toBeUndefined()
    })

    it('생성 클릭 시 유효한 품목만 걸러 invoiceJson으로 담아 업로드 요청을 보낸다', async () => {
        mockPost.mockResolvedValue({data: {jobId: 'job-1'}})
        const wrapper = mountPage()
        await fillMinimumValidInvoice(wrapper)
        await wrapper.find('button:not([type="button"])').trigger('click')
        await flushPromises()

        expect(mockPost).toHaveBeenCalledTimes(1)
        const [url, form] = mockPost.mock.calls[0]
        expect(url).toBe('/api/v1/tools/invoice-generator/upload')
        const invoiceJson = JSON.parse((form as FormData).get('invoiceJson') as string)
        expect(invoiceJson.issuer).toBe('발행사')
        expect(invoiceJson.recipient).toBe('수신사')
        expect(invoiceJson.items).toEqual([{description: '컨설팅', quantity: '1', unitPrice: '100000'}])
    })

    it('완전한 품목 하나 덕에 버튼은 활성화되어도, 수량·단가가 빈 다른 품목은 전송에서 제외한다', async () => {
        mockPost.mockResolvedValue({data: {jobId: 'job-1'}})
        const wrapper = mountPage()
        await fillMinimumValidInvoice(wrapper)
        const addButton = wrapper.findAll('button').find(b => b.text().includes('품목 추가'))!
        await addButton.trigger('click')
        await wrapper.findAll('input').filter(i => i.attributes('placeholder') === '품목명')[1].setValue('배송비')

        await wrapper.find('button:not([type="button"])').trigger('click')
        await flushPromises()

        const [, form] = mockPost.mock.calls[0]
        const invoiceJson = JSON.parse((form as FormData).get('invoiceJson') as string)
        expect(invoiceJson.items).toEqual([{description: '컨설팅', quantity: '1', unitPrice: '100000'}])
    })

    it('업로드 성공 시(단건 job) HeavyJobStatusPanel에 jobId가 전달된다', async () => {
        mockPost.mockResolvedValue({data: {jobId: 'job-1'}})
        const wrapper = mountPage()
        await fillMinimumValidInvoice(wrapper)
        await wrapper.find('button:not([type="button"])').trigger('click')
        await flushPromises()

        expect(wrapper.findComponent(HeavyJobStatusPanel).props('jobId')).toBe('job-1')
    })

    it('업로드 실패 시 에러 메시지가 HeavyJobStatusPanel로 전달된다', async () => {
        mockPost.mockRejectedValue({response: {status: 500}})
        const wrapper = mountPage()
        await fillMinimumValidInvoice(wrapper)
        await wrapper.find('button:not([type="button"])').trigger('click')
        await flushPromises()

        expect(wrapper.findComponent(HeavyJobStatusPanel).props('uploadError')).toBeTruthy()
    })

    it('발행일은 오늘 날짜(YYYY-MM-DD)로 기본 채워진다', () => {
        const wrapper = mountPage()
        expect(inputByPlaceholder(wrapper, '2026-07-18').element.value).toBe(todayDateString())
    })

    it('완전한 품목의 수량×단가 합계를 실시간으로 보여주고, 불완전한 품목은 합계에서 제외한다', async () => {
        const wrapper = mountPage()
        await fillMinimumValidInvoice(wrapper) // 1 × 100000
        expect(wrapper.find('[data-testid="invoice-total"]').text()).toBe((100000).toLocaleString())

        const addButton = wrapper.findAll('button').find(b => b.text().includes('품목 추가'))!
        await addButton.trigger('click')
        const rows = wrapper.findAll('input').filter(i => i.attributes('placeholder') === '품목명')
        expect(rows).toHaveLength(2)
        await wrapper.findAll('input').filter(i => i.attributes('placeholder') === '수량')[1].setValue('3')
        await wrapper.findAll('input').filter(i => i.attributes('placeholder') === '단가')[1].setValue('2000')
        // 두 번째 행은 품목명이 비어 있어(불완전) 3×2000은 합계에 안 잡혀야 한다.
        expect(wrapper.find('[data-testid="invoice-total"]').text()).toBe((100000).toLocaleString())

        await rows[1].setValue('배송비')
        // 이제 완전해졌으니 100000 + 3×2000 = 106000
        expect(wrapper.find('[data-testid="invoice-total"]').text()).toBe((106000).toLocaleString())
    })
})
