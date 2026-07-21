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

// 043: 전역 Job 추적 store는 ToolPage 밖(사이드바)의 관심사이므로, 여기서는
// "Heavy 업로드 시 등록 호출이 나가는지 / Light 실행 시 나가지 않는지"만 확인한다.
const mockTrackActiveJob = vi.fn()
vi.mock('../composables/useActiveJobs', () => ({
    useActiveJobs: () => ({jobs: {value: []}, track: mockTrackActiveJob, dismiss: vi.fn()}),
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

// jsdom엔 EventSource가 없어 최소 mock을 직접 둔다(브라우저 API — 외부 경계이므로 모킹 대상).
// readyState를 직접 조작할 수 있어야 "에러 후 native가 재연결 시도 중(CONNECTING)"과
// "완전히 닫힘(CLOSED)"을 구분하는 실제 동작을 재현할 수 있다.
class MockEventSource {
    static readonly CONNECTING = 0
    static readonly OPEN = 1
    static readonly CLOSED = 2
    static instances: MockEventSource[] = []

    readyState = MockEventSource.OPEN
    onerror: ((e: Event) => void) | null = null
    closeSpy = vi.fn()
    private listeners: Record<string, Array<(e: MessageEvent) => void>> = {}
    url: string

    constructor(url: string) {
        this.url = url
        MockEventSource.instances.push(this)
    }

    addEventListener(type: string, cb: (e: MessageEvent) => void) {
        (this.listeners[type] ??= []).push(cb)
    }

    close() {
        this.readyState = MockEventSource.CLOSED
        this.closeSpy()
    }

    emitMessage(type: string, data: unknown) {
        const event = {data: JSON.stringify(data)} as MessageEvent
        for (const cb of this.listeners[type] ?? []) cb(event)
    }

    // readyState 기본값 CONNECTING: native EventSource가 에러 후 자동 재연결을 시도할 때의 상태.
    emitError(readyState: number = MockEventSource.CONNECTING) {
        this.readyState = readyState
        this.onerror?.(new Event('error'))
    }
}

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

beforeEach(() => {
    vi.clearAllMocks()
    MockEventSource.instances = []
    vi.stubGlobal('EventSource', MockEventSource)
})

afterEach(() => {
    mountedWrappers.splice(0).forEach(w => w.unmount())
    vi.unstubAllGlobals()
})

async function uploadAndGetSse(wrapper: ReturnType<typeof mount>, jobId: string) {
    await wrapper.findComponent(FileUploader).vm.$emit('uploaded', {jobId})
    await flushPromises()
    const es = MockEventSource.instances.at(-1)
    if (!es) throw new Error('EventSource가 생성되지 않았다')
    return es
}

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
            {id: 'img-heavy', name: '이미지 도구', category: 'PDF', isHeavy: true, zones: ['files']},
        ])
        // 프록시가 자른 413(바디 없음)이라도 status만으로 크기 메시지를 보여줘야 한다.
        mockPost.mockRejectedValueOnce({response: {status: 413, data: ''}})

        await selectFile(wrapper, 'big.jpg')

        expect(wrapper.text()).toContain('파일 크기가 제한을 초과')
    })

    it('업로드가 429로 실패하면 크기 메시지가 아닌 쿼터 메시지를 렌더링한다', async () => {
        const wrapper = await mountAt('img-heavy', [
            {id: 'img-heavy', name: '이미지 도구', category: 'PDF', isHeavy: true, zones: ['files']},
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

describe('ToolPage 전역 Job 추적 (043)', () => {
    it('Heavy 모듈 업로드가 성공하면 전역 store에 Job을 등록한다', async () => {
        const wrapper = await mountAt('img-heavy', [
            {id: 'img-heavy', name: '이미지 도구', category: 'PDF', isHeavy: true, zones: ['files']},
        ])

        await uploadAndGetSse(wrapper, 'job-77')

        expect(mockTrackActiveJob).toHaveBeenCalledWith('job-77', 'img-heavy', '이미지 도구')
    })

    it('Light 모듈 실행(/run)은 전역 store에 등록되지 않는다(회귀 없음)', async () => {
        const wrapper = await mountAt('light-tool', [
            {id: 'light-tool', name: '라이트 도구', category: '포맷터', isHeavy: false, zones: ['dev']},
        ])
        mockPost.mockResolvedValueOnce({data: {result: 'ok'}})

        await wrapper.find('textarea').setValue('hello')
        const runButton = wrapper.findAll('button').find(b => b.text() === '실행')
        if (!runButton) throw new Error('실행 버튼을 찾지 못했다')
        await runButton.trigger('click')
        await flushPromises()

        expect(mockPost).toHaveBeenCalledWith('/api/v1/tools/light-tool/run', expect.anything())
        expect(mockTrackActiveJob).not.toHaveBeenCalled()
    })
})

describe('ToolPage 파라미터 필드 (024)', () => {
    it('bcrypt 모듈에 rounds 입력 필드가 기본값 10과 함께 렌더링된다', async () => {
        const wrapper = await mountAt('bcrypt', [
            {id: 'bcrypt', name: 'Bcrypt 해시', category: '보안·암호화', isHeavy: false, zones: ['dev']},
        ])

        const rounds = inputForLabel(wrapper, 'Rounds (강도)')

        expect(rounds?.value).toBe('10')
    })

    it('gif-create 모듈에 delay 입력 필드가 기본값 500과 함께 렌더링된다', async () => {
        const wrapper = await mountAt('gif-create', [
            {id: 'gif-create', name: 'GIF 생성', category: '이미지', isHeavy: true, zones: ['files']},
        ])

        const delay = inputForLabel(wrapper, '프레임 간격 (ms)')

        expect(delay?.value).toBe('500')
    })

    it('color 타입 파라미터는 텍스트 입력이 아니라 네이티브 색상 선택기로 렌더링되고 기본값이 채워진다', async () => {
        const wrapper = await mountAt('gif-create', [
            {id: 'gif-create', name: 'GIF 생성', category: '이미지', isHeavy: true, zones: ['files']},
        ])

        const captionColor = inputForLabel(wrapper, '자막 글자 색상')

        expect(captionColor?.type).toBe('color')
        expect(captionColor?.value).toBe('#ffffff')
    })
})

describe('ToolPage 이미지 리사이즈 크기 입력 UI', () => {
    const imageResize: Module = {id: 'image-resize', name: '이미지 리사이즈', category: '이미지', isHeavy: true, zones: ['files']}

    async function setFileDimensions(wrapper: ReturnType<typeof mount>, width: number, height: number) {
        await wrapper.findComponent(FileUploader).vm.$emit('dimensions', {width, height})
        await flushPromises()
    }

    it('프리셋 선택 후 너비를 직접 수정하면 프리셋 선택이 "직접 입력"으로 되돌아간다', async () => {
        const wrapper = await mountAt('image-resize', [imageResize])

        const preset = wrapper.find('[data-testid="resize-preset"]')
        await preset.setValue('1920 x 1080 (FHD)')
        expect((preset.element as HTMLSelectElement).value).toBe('1920 x 1080 (FHD)')

        const width = wrapper.find('[data-testid="resize-width-px"]')
        await width.setValue('500')
        await width.trigger('input')

        expect((preset.element as HTMLSelectElement).value).toBe('')
    })

    it('확대 방지가 켜진 채 원본보다 큰 너비를 입력하면 즉시 원본 크기로 되돌아간다', async () => {
        const wrapper = await mountAt('image-resize', [imageResize])
        await setFileDimensions(wrapper, 400, 300)

        const width = wrapper.find('[data-testid="resize-width-px"]')
        await width.setValue('1920')
        await width.trigger('input')

        expect((width.element as HTMLInputElement).value).toBe('400')
        // 종횡비 유지 기본값(true)이라 높이도 원본 비율로 같이 맞춰져야 한다
        const height = wrapper.find('[data-testid="resize-height-px"]')
        expect((height.element as HTMLInputElement).value).toBe('300')
    })

    it('확대 방지를 끄면 원본보다 큰 값을 그대로 유지한다', async () => {
        const wrapper = await mountAt('image-resize', [imageResize])
        await setFileDimensions(wrapper, 400, 300)

        const preventUpscale = wrapper.find('input[type="checkbox"]')
        await preventUpscale.setValue(false)
        await flushPromises()

        const width = wrapper.find('[data-testid="resize-width-px"]')
        await width.setValue('1920')
        await width.trigger('input')

        expect((width.element as HTMLInputElement).value).toBe('1920')
    })

    it('% 모드 + 종횡비 잠금에서 확대 방지가 켜져 있으면 100 초과 입력이 100으로 즉시 조정된다', async () => {
        const wrapper = await mountAt('image-resize', [imageResize])
        await wrapper.find('[data-testid="resize-unit"]').setValue('%')

        const percent = wrapper.find('[data-testid="resize-percent-linked"]')
        await percent.setValue('250')

        expect((percent.element as HTMLInputElement).value).toBe('100')
    })

    it('% 모드 + 종횡비 해제에서도 확대 방지가 각 칸을 독립적으로 100까지 제한한다', async () => {
        const wrapper = await mountAt('image-resize', [imageResize])
        await wrapper.find('[data-testid="resize-unit"]').setValue('%')
        await wrapper.find('[data-testid="resize-aspect-lock"]').trigger('click')

        const width = wrapper.find('[data-testid="resize-width-percent"]')
        await width.setValue('300')
        await width.trigger('input')
        const height = wrapper.find('[data-testid="resize-height-percent"]')
        await height.setValue('50')
        await height.trigger('input')

        expect((width.element as HTMLInputElement).value).toBe('100')
        expect((height.element as HTMLInputElement).value).toBe('50') // 축소 값은 그대로 유지
    })

    it('단위를 px에서 %로 바꾸면 값이 100/100 기본값으로 초기화된다', async () => {
        const wrapper = await mountAt('image-resize', [imageResize])
        const width = wrapper.find('[data-testid="resize-width-px"]')
        await width.setValue('1920')
        await width.trigger('input')

        await wrapper.find('[data-testid="resize-unit"]').setValue('%')
        await flushPromises()

        const percent = wrapper.find('[data-testid="resize-percent-linked"]')
        expect((percent.element as HTMLInputElement).value).toBe('100')
    })

    it('프리셋을 먼저 고른 뒤 그보다 작은 이미지를 올리면 확대 방지로 조정되면서 프리셋 선택이 "직접 입력"으로 되돌아간다', async () => {
        // 파일이 아직 없을 때는 모든 프리셋이 선택 가능하다(비활성화는 원본 크기를 알 때만 계산됨).
        const wrapper = await mountAt('image-resize', [imageResize])
        const preset = wrapper.find('[data-testid="resize-preset"]')
        await preset.setValue('1920 x 1080 (FHD)')
        await flushPromises()
        expect((preset.element as HTMLSelectElement).value).toBe('1920 x 1080 (FHD)')

        // 이후 그보다 작은 이미지가 올라오면 필드가 원본 크기로 조정되고 프리셋 선택은 해제돼야 한다.
        await setFileDimensions(wrapper, 400, 300)

        expect((wrapper.find('[data-testid="resize-width-px"]').element as HTMLInputElement).value).toBe('400')
        expect((wrapper.find('[data-testid="resize-height-px"]').element as HTMLInputElement).value).toBe('300')
        expect((preset.element as HTMLSelectElement).value).toBe('')
    })

    it('원본 크기를 알고 확대 방지가 켜져 있으면 원본보다 큰 프리셋만 드롭다운에서 비활성화된다', async () => {
        // 1500x1000 기준: 1920x1080(폭 초과)·1080x1080(높이 초과)은 비활성, 1280x720·800x600은 활성
        const wrapper = await mountAt('image-resize', [imageResize])
        await setFileDimensions(wrapper, 1500, 1000)

        const options = wrapper.findAll('[data-testid="resize-preset"] option')
        const tooWide = options.find(o => o.text().startsWith('1920 x 1080'))!
        const tooTall = options.find(o => o.text().startsWith('1080 x 1080'))!
        const fitsHd = options.find(o => o.text().startsWith('1280 x 720'))!
        const fitsSmall = options.find(o => o.text().startsWith('800 x 600'))!

        expect(tooWide.attributes('disabled')).toBeDefined()
        expect(tooTall.attributes('disabled')).toBeDefined()
        expect(fitsHd.attributes('disabled')).toBeUndefined()
        expect(fitsSmall.attributes('disabled')).toBeUndefined()
    })

    it('필드 값을 바꾸면 결과 크기 미리보기 숫자가 그 값 기준으로 즉시 갱신된다', async () => {
        const wrapper = await mountAt('image-resize', [imageResize])
        await setFileDimensions(wrapper, 400, 300)

        const width = wrapper.find('[data-testid="resize-width-px"]')
        await width.setValue('200')
        await width.trigger('input')

        // 종횡비 잠금 상태이므로 높이도 비율(200/400*300=150)에 맞춰 자동 계산된 결과가 보여야 한다.
        expect(wrapper.find('[data-testid="resize-preview"]').text()).toContain('200 x 150')
    })

    it('여러 장 업로드(배치, dimensions=null)일 때도 확대 방지 동작을 설명하는 안내 문구가 항상 보인다', async () => {
        const wrapper = await mountAt('image-resize', [imageResize])
        await wrapper.findComponent(FileUploader).vm.$emit('dimensions', null)
        await flushPromises()

        // 종횡비 잠금 해제 상태에서도 (예전엔 빈 문자열이었음) 안내가 보여야 한다.
        await wrapper.find('[data-testid="resize-aspect-lock"]').trigger('click')

        const preview = wrapper.find('[data-testid="resize-preview"]')
        expect(preview.exists()).toBe(true)
        expect(preview.text()).toContain('원본보다 커지지 않도록')
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
            {id: 'qr-code', name: 'QR 코드 생성', category: '생성기', isHeavy: false, zones: ['dev']},
            {id: 'barcode', name: '바코드 생성', category: '생성기', isHeavy: false, zones: ['dev']},
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
    const imageResize: Module = {id: 'image-resize', name: '이미지 리사이즈', category: '이미지', isHeavy: true, zones: ['files']}

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

describe('ToolPage 단건 SSE 재연결 (042)', () => {
    const imgHeavy: Module = {id: 'img-heavy', name: '이미지 도구', category: 'PDF', isHeavy: true, zones: ['files']}

    it('SSE 에러(native 재연결 중) 시 연결을 닫지 않고 "재연결 중" 상태를 보여준다', async () => {
        const wrapper = await mountAt('img-heavy', [imgHeavy])
        const es = await uploadAndGetSse(wrapper, 'job-1')

        es.emitError() // 기본값 CONNECTING — native가 재연결을 시도 중인 상태

        await flushPromises()
        expect(es.closeSpy).not.toHaveBeenCalled()
        expect(wrapper.text()).toContain('재연결 중')
    })

    it('재연결 중 정상 메시지가 오면 "재연결 중" 상태가 해제되고 진행률을 이어서 보여준다', async () => {
        const wrapper = await mountAt('img-heavy', [imgHeavy])
        const es = await uploadAndGetSse(wrapper, 'job-1')

        es.emitError()
        await flushPromises()
        expect(wrapper.text()).toContain('재연결 중')

        es.emitMessage('job-status-changed', {status: 'RUNNING', queuePosition: 0, progress: 42, etaSeconds: 10})
        await flushPromises()

        expect(wrapper.text()).not.toContain('재연결 중')
        expect(wrapper.text()).toContain('42%')
    })

    it('정상 종료(FAILED)는 재연결과 무관하게 연결을 닫고 실패 결과를 보여준다 (격리검증)', async () => {
        const wrapper = await mountAt('img-heavy', [imgHeavy])
        const es = await uploadAndGetSse(wrapper, 'job-1')

        es.emitMessage('job-status-changed', {status: 'FAILED', queuePosition: 0, progress: 0, etaSeconds: null})
        await flushPromises()

        expect(es.closeSpy).toHaveBeenCalled()
        expect(wrapper.text()).not.toContain('재연결 중')
        // ResultViewer는 textarea에 값을 프로퍼티로 바인딩해 wrapper.text()엔 안 잡힌다.
        const textarea = wrapper.find('textarea')
        expect(textarea.element.value).toContain('처리에 실패했습니다')
    })

    it('연속 5회 에러 시 명시적으로 닫고 최종 실패 메시지를 보여준다', async () => {
        const wrapper = await mountAt('img-heavy', [imgHeavy])
        const es = await uploadAndGetSse(wrapper, 'job-1')

        for (let i = 0; i < 5; i++) {
            es.emitError()
        }
        await flushPromises()

        expect(es.closeSpy).toHaveBeenCalled()
        expect(wrapper.text()).toContain('상태를 확인할 수 없습니다')
    })

    it('네이티브가 완전히 포기(readyState=CLOSED)하면 5회를 기다리지 않고 즉시 실패 처리한다', async () => {
        const wrapper = await mountAt('img-heavy', [imgHeavy])
        const es = await uploadAndGetSse(wrapper, 'job-1')

        // CLOSED면 native가 더 이상 onerror를 호출하지 않으므로, 카운트가 5에 도달할 기회 자체가 없다.
        es.emitError(MockEventSource.CLOSED)
        await flushPromises()

        expect(wrapper.text()).toContain('상태를 확인할 수 없습니다')
    })
})

describe('ToolPage — component 필드 (kind: game)', () => {
    it('mod.component가 있으면 그 컴포넌트를 렌더링하고, 기본 도구 헤더(즐겨찾기 등)는 렌더링하지 않는다', async () => {
        const StubGame = {template: '<div data-testid="stub-game">GAME CONTENT</div>'}
        const wrapper = await mountAt('game-2048', [
            {
                id: 'game-2048', name: '2048', category: '게임', isHeavy: false, isFrontendOnly: true,
                kind: 'game', zones: ['fun'], component: () => Promise.resolve(StubGame),
            },
        ])

        await vi.waitFor(() => expect(wrapper.find('[data-testid="stub-game"]').exists()).toBe(true))

        expect(wrapper.find('[data-testid="stub-game"]').text()).toBe('GAME CONTENT')
        expect(wrapper.text()).not.toContain('즐겨찾기')
    })
})

describe('ToolPage 배치 폴링 실패 (042)', () => {
    const imageResize: Module = {id: 'image-resize', name: '이미지 리사이즈', category: '이미지', isHeavy: true, zones: ['files']}

    it('BatchPoller가 error를 emit하면 실패 메시지를 보여주고 폴러를 내린다', async () => {
        const wrapper = await mountAt('image-resize', [imageResize])

        wrapper.findComponent(FileUploader).vm.$emit('uploaded', {batchId: 'b-9', jobIds: ['j1', 'j2']})
        await flushPromises()
        wrapper.findComponent(BatchPoller).vm.$emit('error')
        await flushPromises()

        expect(wrapper.text()).toContain('상태를 확인할 수 없습니다')
        expect(wrapper.findComponent(BatchPoller).exists()).toBe(false)
    })

    it('배치 실패 후 새로 업로드하면 실패 상태가 초기화되고 폴러가 다시 뜬다', async () => {
        const wrapper = await mountAt('image-resize', [imageResize])

        wrapper.findComponent(FileUploader).vm.$emit('uploaded', {batchId: 'b-9', jobIds: ['j1', 'j2']})
        await flushPromises()
        wrapper.findComponent(BatchPoller).vm.$emit('error')
        await flushPromises()
        expect(wrapper.text()).toContain('상태를 확인할 수 없습니다')

        wrapper.findComponent(FileUploader).vm.$emit('uploaded', {batchId: 'b-10', jobIds: ['j3', 'j4']})
        await flushPromises()

        expect(wrapper.text()).not.toContain('상태를 확인할 수 없습니다')
        expect(wrapper.findComponent(BatchPoller).exists()).toBe(true)
    })

    it('BatchPoller가 retrying을 emit하면 재연결 중 상태를 보여주고, progress가 오면 해제한다', async () => {
        const wrapper = await mountAt('image-resize', [imageResize])

        wrapper.findComponent(FileUploader).vm.$emit('uploaded', {batchId: 'b-9', jobIds: ['j1', 'j2']})
        await flushPromises()
        wrapper.findComponent(BatchPoller).vm.$emit('retrying')
        await flushPromises()
        expect(wrapper.text()).toContain('재연결 중')

        wrapper.findComponent(BatchPoller).vm.$emit('progress', {batchId: 'b-9', totalCount: 2, doneCount: 1, failCount: 0})
        await flushPromises()
        expect(wrapper.text()).not.toContain('재연결 중')
    })
})
