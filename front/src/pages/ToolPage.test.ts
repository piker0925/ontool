import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {flushPromises, mount} from '@vue/test-utils'
import {createMemoryHistory, createRouter} from 'vue-router'
import ToolPage from './ToolPage.vue'
import FileUploader from '../components/FileUploader.vue'
import BatchPoller from '../components/BatchPoller.vue'
import {apiClient} from '../api/client'
import type {Module} from '../types'

vi.mock('../api/client', () => ({
    apiClient: {get: vi.fn(), post: vi.fn()},
}))

const mockGet = apiClient.get as ReturnType<typeof vi.fn>
const mockPost = apiClient.post as ReturnType<typeof vi.fn>

function mockModules(modules: Module[]) {
    mockGet.mockImplementation((url: string) => {
        if (url === '/api/v1/modules') return Promise.resolve({data: modules})
        if (url.includes('/stats')) return Promise.resolve({data: {useCount: 0, likeCount: 0}})
        return Promise.reject(new Error('unexpected GET ' + url))
    })
}

const router = createRouter({
    history: createMemoryHistory(),
    routes: [{path: '/tools/:moduleId', component: ToolPage}],
})

// mountAt으로 만든 wrapper를 추적해 매 테스트 후 언마운트한다.
// 언마운트하지 않으면 BatchPoller의 setTimeout 폴링이 다음 테스트(다른 mock 상태)까지
// 살아남아 "unexpected GET" 같은 미처리 프라미스 거부를 흘린다.
const mountedWrappers: ReturnType<typeof mount>[] = []

async function mountAt(moduleId: string, modules: Module[]) {
    mockModules(modules)
    await router.push(`/tools/${moduleId}`)
    const wrapper = mount(ToolPage, {global: {plugins: [router], stubs: {CommentSection: true}}})
    mountedWrappers.push(wrapper)
    await flushPromises()
    return wrapper
}

function inputForLabel(wrapper: ReturnType<typeof mount>, labelText: string) {
    const label = wrapper.findAll('label').find(l => l.text() === labelText)
    if (!label) return null
    return label.element.parentElement?.querySelector('input') as HTMLInputElement | null
}

beforeEach(() => vi.clearAllMocks())

afterEach(() => {
    mountedWrappers.splice(0).forEach(w => w.unmount())
})

describe('ToolPage 업로드 실패 표시 (032)', () => {
    // 034: 파일 선택은 스테이징만 하고, '실행' 버튼을 눌러야 업로드된다.
    async function selectFile(wrapper: ReturnType<typeof mount>, name: string) {
        const file = new File(['x'], name, {type: 'image/jpeg'})
        const inputEl = wrapper.find('input[type="file"]').element as HTMLInputElement
        Object.defineProperty(inputEl, 'files', {value: [file], configurable: true})
        await wrapper.find('input[type="file"]').trigger('change')
        await flushPromises()
        await wrapper.find('[data-testid="confirm-upload"]').trigger('click')
        await flushPromises()
    }

    it('업로드가 413으로 실패하면 결과 영역에 크기 초과 메시지를 렌더링한다', async () => {
        const wrapper = await mountAt('img-heavy', [
            {id: 'img-heavy', name: '이미지 도구', category: 'PDF', isHeavy: true},
        ])
        // 프록시가 자른 413(바디 없음)이라도 status만으로 크기 메시지를 보여줘야 한다.
        mockPost.mockRejectedValueOnce({response: {status: 413, data: ''}})

        await selectFile(wrapper, 'big.jpg')

        expect(wrapper.text()).toContain('파일 크기가 제한을 초과')
    })

    it('업로드가 429로 실패하면 크기 메시지가 아닌 쿼터 메시지를 렌더링한다', async () => {
        const wrapper = await mountAt('img-heavy', [
            {id: 'img-heavy', name: '이미지 도구', category: 'PDF', isHeavy: true},
        ])
        mockPost.mockRejectedValueOnce({
            response: {status: 429, data: {message: '동시에 처리 중인 작업이 너무 많습니다. 잠시 후 다시 시도해 주세요.'}},
        })

        await selectFile(wrapper, 'a.jpg')

        const text = wrapper.text()
        expect(text).toContain('처리 중인 작업')
        expect(text).not.toContain('파일 크기가 제한을 초과')
    })
})

describe('ToolPage 파라미터 필드 (024)', () => {
    it('bcrypt 모듈에 rounds 입력 필드가 기본값 10과 함께 렌더링된다', async () => {
        const wrapper = await mountAt('bcrypt', [
            {id: 'bcrypt', name: 'Bcrypt 해시', category: '보안·암호화', isHeavy: false},
        ])

        const rounds = inputForLabel(wrapper, 'Rounds (강도)')

        expect(rounds?.value).toBe('10')
    })

    it('gif-create 모듈에 delay 입력 필드가 기본값 100과 함께 렌더링된다', async () => {
        const wrapper = await mountAt('gif-create', [
            {id: 'gif-create', name: 'GIF 생성', category: '이미지', isHeavy: true},
        ])

        const delay = inputForLabel(wrapper, '프레임 간격 (ms)')

        expect(delay?.value).toBe('100')
    })
})

describe('ToolPage 통합 코드 생성기 (code-gen)', () => {
    it('code-gen 모듈은 QR/Code128 형식 선택이 있는 통합 페이지를 렌더링한다', async () => {
        const wrapper = await mountAt('code-gen', [])
        // UnifiedCodeGenPage는 defineAsyncComponent로 지연 로딩되어 실제 동적 import(파일시스템 접근)를
        // 기다려야 하므로 flushPromises 고정 횟수 대신 시간 기반 폴링으로 대기한다.
        await vi.waitFor(() => expect(wrapper.findAll('select').length).toBeGreaterThan(0))

        const formatSelect = wrapper.findAll('select').at(0)
        expect(formatSelect).toBeTruthy()
        const options = formatSelect!.findAll('option').map(o => o.text())
        expect(options).toEqual(['QR 코드', '바코드 · Code 128', '바코드 · EAN-13'])

        // QR 기본 형식에서는 size 입력이 기본값 300으로 렌더링된다
        const size = inputForLabel(wrapper, '크기 (px)')
        expect(size?.value).toBe('300')
    })

    it('qr-code/barcode 백엔드 모듈은 통합 도구로 흡수되어 개별 페이지가 노출되지 않는다', async () => {
        const wrapper = await mountAt('qr-code', [
            {id: 'qr-code', name: 'QR 코드 생성', category: '생성기', isHeavy: false},
            {id: 'barcode', name: '바코드 생성', category: '생성기', isHeavy: false},
        ])

        expect(wrapper.text()).toContain('모듈을 찾을 수 없습니다')
    })

    it('바코드 형식으로 바꾸면 너비/높이 입력이 기본값과 함께 렌더링된다', async () => {
        const wrapper = await mountAt('code-gen', [])
        await vi.waitFor(() => expect(wrapper.findAll('select').length).toBeGreaterThan(0))

        const formatSelect = wrapper.findAll('select').at(0)!
        await formatSelect.setValue('code128')

        const width = inputForLabel(wrapper, '너비 (px)')
        const height = inputForLabel(wrapper, '높이 (px)')
        expect(width?.value).toBe('400')
        expect(height?.value).toBe('120')
    })
})

describe('ToolPage 배치 (027)', () => {
    const imageResize: Module = {id: 'image-resize', name: '이미지 리사이즈', category: '이미지', isHeavy: true}

    it('업로드 응답이 배치면 배치 진행률 뷰(BatchPoller)로 진입한다', async () => {
        const wrapper = await mountAt('image-resize', [imageResize])

        wrapper.findComponent(FileUploader).vm.$emit('uploaded', {batchId: 'b-9', jobIds: ['j1', 'j2']})
        await flushPromises()

        const poller = wrapper.findComponent(BatchPoller)
        expect(poller.exists()).toBe(true)
        expect(poller.props('batchId')).toBe('b-9')
    })

    it('단건 응답에서는 배치 뷰가 나타나지 않는다', async () => {
        const wrapper = await mountAt('image-resize', [imageResize])

        wrapper.findComponent(FileUploader).vm.$emit('uploaded', {jobId: 'job-1'})
        await flushPromises()

        expect(wrapper.findComponent(BatchPoller).exists()).toBe(false)
    })

    it('배치 완료 시 해당 배치의 ZIP 다운로드 링크가 나타난다', async () => {
        const wrapper = await mountAt('image-resize', [imageResize])

        wrapper.findComponent(FileUploader).vm.$emit('uploaded', {batchId: 'b-9', jobIds: ['j1', 'j2']})
        await flushPromises()
        wrapper.findComponent(BatchPoller).vm.$emit('done', {batchId: 'b-9', totalCount: 2, doneCount: 2, failCount: 0})
        await flushPromises()

        const link = wrapper.find('a[data-testid="batch-download"]')
        expect(link.exists()).toBe(true)
        expect(link.attributes('href')).toContain('/api/v1/batches/b-9/result')
    })

    it('배치 진행률 텍스트에 완료/전체 개수를 표시한다', async () => {
        const wrapper = await mountAt('image-resize', [imageResize])

        wrapper.findComponent(FileUploader).vm.$emit('uploaded', {batchId: 'b-9', jobIds: ['j1', 'j2', 'j3']})
        await flushPromises()
        wrapper.findComponent(BatchPoller).vm.$emit('progress', {batchId: 'b-9', totalCount: 3, doneCount: 1, failCount: 0})
        await flushPromises()

        expect(wrapper.text()).toContain('1 / 3')
    })
})
