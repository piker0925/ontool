import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

vi.mock('vue-sonner', () => ({
    toast: {success: vi.fn(), error: vi.fn()},
}))

// 164: DONE 시점에 결과/만료 조회(GET /result, GET /{id})를 호출하므로 apiClient를 모킹한다 —
// useHeavyJob.test.ts와 동일 패턴. 기본값은 "만료 전 + 다운로드 가능"이고, 개별 테스트에서 override한다.
vi.mock('../api/client', () => ({
    apiClient: {get: vi.fn()},
}))

// jsdom엔 EventSource가 없어 최소 mock을 직접 둔다 — useHeavyJob.test.ts와 동일 패턴.
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
}

// 이 store는 모듈 최상단에서 즉시 localStorage를 읽고(load) SSE 재연결(resumeAll)까지 수행하므로,
// "새로고침 후 복원" 시나리오를 검증하려면 매 테스트마다 모듈을 완전히 새로 import해야 한다.
// vi.resetModules()는 mock 모듈도 다시 평가하므로, apiClient.get의 mock 함수도 매번 새로 가져와야
// 실제로 useActiveJobs.ts가 호출하는 것과 같은 참조를 잡는다(파일 상단에서 한 번만 import하면 어긋난다).
async function freshStore() {
    vi.resetModules()
    const {apiClient} = await import('../api/client')
    const mod = await import('./useActiveJobs')
    return {...mod.useActiveJobs(), mockGet: apiClient.get as ReturnType<typeof vi.fn>}
}

beforeEach(() => {
    localStorage.clear()
    MockEventSource.instances = []
    vi.stubGlobal('EventSource', MockEventSource)
})

afterEach(() => {
    vi.unstubAllGlobals()
})

describe('useActiveJobs', () => {
    it('track()으로 새 Heavy Job을 등록하고 SSE 연결을 연다', async () => {
        const store = await freshStore()
        store.track('job-1', 'pdf-merge', 'PDF 병합')

        expect(store.jobs.value).toHaveLength(1)
        expect(store.jobs.value[0]).toMatchObject({
            jobId: 'job-1', moduleId: 'pdf-merge', moduleName: 'PDF 병합', status: 'PENDING',
        })
        expect(MockEventSource.instances).toHaveLength(1)
        expect(MockEventSource.instances[0].url).toContain('/api/v1/jobs/job-1/stream')
    })

    it('track()은 localStorage에 즉시 저장한다', async () => {
        const store = await freshStore()
        store.track('job-1', 'pdf-merge', 'PDF 병합')

        const stored = JSON.parse(localStorage.getItem('devtoolbox-active-jobs') ?? '[]')
        expect(stored).toHaveLength(1)
        expect(stored[0].jobId).toBe('job-1')
    })

    it('같은 jobId로 다시 track()해도 중복 등록하거나 두 번째 연결을 열지 않는다', async () => {
        const store = await freshStore()
        store.track('job-1', 'pdf-merge', 'PDF 병합')
        store.track('job-1', 'pdf-merge', 'PDF 병합')

        expect(store.jobs.value).toHaveLength(1)
        expect(MockEventSource.instances).toHaveLength(1)
    })

    it('진행률 메시지를 받으면 해당 Job의 progress/queuePosition/status를 갱신한다', async () => {
        const store = await freshStore()
        store.track('job-1', 'pdf-merge', 'PDF 병합')
        const es = MockEventSource.instances[0]

        es.emitMessage('job-status-changed', {status: 'RUNNING', queuePosition: 0, progress: 40, etaSeconds: 10})

        expect(store.jobs.value[0]).toMatchObject({status: 'RUNNING', progress: 40, queuePosition: 0})
    })

    it('DONE 메시지를 받으면 상태를 DONE으로 바꾸고 연결을 닫고 성공 토스트를 띄운다', async () => {
        const {toast} = await import('vue-sonner')
        const store = await freshStore()
        store.track('job-1', 'pdf-merge', 'PDF 병합')
        const es = MockEventSource.instances[0]

        es.emitMessage('job-status-changed', {status: 'DONE', queuePosition: 0, progress: 100})

        expect(store.jobs.value[0].status).toBe('DONE')
        expect(es.closeSpy).toHaveBeenCalled()
        expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('PDF 병합'))
    })

    it('DONE 메시지를 받으면 result·상태 API를 조회해 downloadUrl/expiresAt을 채운다', async () => {
        const store = await freshStore()
        store.mockGet.mockImplementation((url: string) => {
            if (url === '/api/v1/jobs/job-1/result') {
                return Promise.resolve({data: {url: 'https://files.example/job-1.pdf', text: null}})
            }
            if (url === '/api/v1/jobs/job-1') {
                return Promise.resolve({data: {expiresAt: '2099-01-01T00:00:00'}})
            }
            throw new Error(`unexpected url: ${url}`)
        })
        store.track('job-1', 'pdf-merge', 'PDF 병합')
        const es = MockEventSource.instances[0]

        es.emitMessage('job-status-changed', {status: 'DONE', queuePosition: 0, progress: 100})

        await vi.waitFor(() => expect(store.jobs.value[0].downloadUrl).not.toBeNull())
        expect(store.jobs.value[0].downloadUrl).toBe('https://files.example/job-1.pdf')
        expect(store.jobs.value[0].expiresAt).toBe('2099-01-01T00:00:00')
    })

    it('result 조회 API가 만료돼 url:null을 반환하면 downloadUrl도 null로 유지된다', async () => {
        const store = await freshStore()
        store.mockGet.mockImplementation((url: string) => {
            if (url === '/api/v1/jobs/job-1/result') {
                return Promise.resolve({data: {url: null, text: '결과 텍스트'}})
            }
            return Promise.resolve({data: {expiresAt: '2020-01-01T00:00:00'}})
        })
        store.track('job-1', 'pdf-merge', 'PDF 병합')
        const es = MockEventSource.instances[0]

        es.emitMessage('job-status-changed', {status: 'DONE', queuePosition: 0, progress: 100})

        await vi.waitFor(() => expect(store.jobs.value[0].expiresAt).toBe('2020-01-01T00:00:00'))
        expect(store.jobs.value[0].downloadUrl).toBeNull()
    })

    it('FAILED 메시지를 받으면 상태를 FAILED로 바꾸고 실패 토스트를 띄운다', async () => {
        const {toast} = await import('vue-sonner')
        const store = await freshStore()
        store.track('job-1', 'pdf-merge', 'PDF 병합')
        const es = MockEventSource.instances[0]

        es.emitMessage('job-status-changed', {status: 'FAILED', queuePosition: 0, progress: 0})

        expect(store.jobs.value[0].status).toBe('FAILED')
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('PDF 병합'))
    })

    it('dismiss()는 목록에서 제거하고 localStorage에도 반영한다', async () => {
        const store = await freshStore()
        store.track('job-1', 'pdf-merge', 'PDF 병합')

        store.dismiss('job-1')

        expect(store.jobs.value).toHaveLength(0)
        const stored = JSON.parse(localStorage.getItem('devtoolbox-active-jobs') ?? '[]')
        expect(stored).toHaveLength(0)
    })

    it('새로고침(모듈 재로드) 시 PENDING/RUNNING으로 저장돼 있던 Job은 목록에 복원되고 SSE가 재연결된다', async () => {
        const saved = [{
            jobId: 'job-old', moduleId: 'image-resize', moduleName: '이미지 리사이즈',
            status: 'RUNNING', progress: 55, queuePosition: 0, startedAt: 1,
        }]
        localStorage.setItem('devtoolbox-active-jobs', JSON.stringify(saved))

        const store = await freshStore()

        expect(store.jobs.value).toHaveLength(1)
        expect(store.jobs.value[0].jobId).toBe('job-old')
        expect(MockEventSource.instances).toHaveLength(1)
        expect(MockEventSource.instances[0].url).toContain('/api/v1/jobs/job-old/stream')
    })

    it('새로고침 시 이미 DONE/FAILED로 저장된 Job은 목록엔 남지만 다시 연결을 열지 않는다(불필요한 연결 낭비 방지)', async () => {
        const saved = [
            {jobId: 'job-done', moduleId: 'a', moduleName: 'A', status: 'DONE', progress: 100, queuePosition: 0, startedAt: 1},
            {jobId: 'job-running', moduleId: 'b', moduleName: 'B', status: 'RUNNING', progress: 10, queuePosition: 0, startedAt: 2},
        ]
        localStorage.setItem('devtoolbox-active-jobs', JSON.stringify(saved))

        const store = await freshStore()

        expect(store.jobs.value).toHaveLength(2)
        expect(MockEventSource.instances).toHaveLength(1)
        expect(MockEventSource.instances[0].url).toContain('/api/v1/jobs/job-running/stream')
    })
})
