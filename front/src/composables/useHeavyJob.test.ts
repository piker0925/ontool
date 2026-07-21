import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {defineComponent, h} from 'vue'
import {mount} from '@vue/test-utils'
import {useHeavyJob} from './useHeavyJob'
import {apiClient} from '../api/client'

vi.mock('../api/client', () => ({
    apiClient: {get: vi.fn(), post: vi.fn()},
}))

// 043: useHeavyJob은 moduleId/moduleName이 주어지면 전역 "내 작업" 추적 store에도 등록한다.
// 이 파일의 관심사는 useHeavyJob 자체의 SSE/결과 로직이므로 store 호출 여부만 스텁으로 검증한다.
const mockTrackActiveJob = vi.fn()
vi.mock('./useActiveJobs', () => ({
    useActiveJobs: () => ({jobs: {value: []}, track: mockTrackActiveJob, dismiss: vi.fn()}),
}))

const mockGet = apiClient.get as ReturnType<typeof vi.fn>

// jsdom엔 EventSource가 없어 최소 mock을 직접 둔다 — ToolPage.test.ts의 MockEventSource와 동일 패턴.
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

    emitError(readyState: number = MockEventSource.CONNECTING) {
        this.readyState = readyState
        this.onerror?.(new Event('error'))
    }
}

// useHeavyJob은 onUnmounted를 쓰므로 setup 컨텍스트 안에서 호출해야 한다 — 얇은 호스트 컴포넌트로 감싼다.
function mountHeavyJob() {
    let heavyJob!: ReturnType<typeof useHeavyJob>
    const wrapper = mount(defineComponent({
        setup() {
            heavyJob = useHeavyJob()
            return () => h('div')
        },
    }))
    return {wrapper, heavyJob}
}

beforeEach(() => {
    vi.clearAllMocks()
    MockEventSource.instances = []
    vi.stubGlobal('EventSource', MockEventSource)
})

afterEach(() => {
    vi.unstubAllGlobals()
})

describe('useHeavyJob', () => {
    it('track()으로 SSE 연결을 열고 jobId를 기록한다', () => {
        const {heavyJob} = mountHeavyJob()
        heavyJob.track('job-1')
        expect(heavyJob.jobId.value).toBe('job-1')
        expect(MockEventSource.instances).toHaveLength(1)
        expect(MockEventSource.instances[0].url).toContain('/api/v1/jobs/job-1/stream')
    })

    it('progress 메시지를 받으면 progress 상태에 반영한다', () => {
        const {heavyJob} = mountHeavyJob()
        heavyJob.track('job-1')
        const es = MockEventSource.instances[0]
        es.emitMessage('job-status-changed', {status: 'RUNNING', queuePosition: 2, progress: 40, etaSeconds: 15})
        expect(heavyJob.progress.value).toEqual({queuePosition: 2, progress: 40, etaSeconds: 15})
    })

    it('DONE 메시지를 받으면 SSE를 닫고 결과를 조회한다', async () => {
        mockGet.mockResolvedValue({data: {url: '/api/v1/files/job-1/result.pdf', text: null}})
        const {heavyJob} = mountHeavyJob()
        heavyJob.track('job-1')
        const es = MockEventSource.instances[0]
        es.emitMessage('job-status-changed', {status: 'DONE', queuePosition: 0, progress: 100, etaSeconds: null})
        await vi.waitFor(() => expect(heavyJob.result.value).not.toBeNull())
        expect(es.closeSpy).toHaveBeenCalled()
        expect(heavyJob.result.value).toEqual({url: '/api/v1/files/job-1/result.pdf', text: null})
        expect(heavyJob.failed.value).toBe(false)
    })

    it('FAILED 메시지를 받으면 결과 조회 없이 실패로 표시한다', () => {
        const {heavyJob} = mountHeavyJob()
        heavyJob.track('job-1')
        const es = MockEventSource.instances[0]
        es.emitMessage('job-status-changed', {status: 'FAILED', queuePosition: 0, progress: 0, etaSeconds: null})
        expect(heavyJob.failed.value).toBe(true)
        expect(heavyJob.result.value).toEqual({url: null, text: '처리에 실패했습니다.'})
        expect(mockGet).not.toHaveBeenCalled()
    })

    it('연결이 완전히 CLOSED된 채 에러가 나면 재시도 횟수와 무관하게 즉시 sseFailed로 처리한다', () => {
        const {heavyJob} = mountHeavyJob()
        heavyJob.track('job-1')
        const es = MockEventSource.instances[0]
        es.emitError(MockEventSource.CLOSED)
        expect(heavyJob.sseFailed.value).toBe(true)
        expect(heavyJob.reconnecting.value).toBe(false)
    })

    it('CONNECTING 상태의 에러는 재연결 시도 중으로만 표시하고 sseFailed로 넘어가지 않는다(최대 횟수 미만)', () => {
        const {heavyJob} = mountHeavyJob()
        heavyJob.track('job-1')
        const es = MockEventSource.instances[0]
        es.emitError(MockEventSource.CONNECTING)
        expect(heavyJob.reconnecting.value).toBe(true)
        expect(heavyJob.sseFailed.value).toBe(false)
    })

    it('CONNECTING 에러가 연속 5회 누적되면 포기하고 sseFailed로 표시한다', () => {
        const {heavyJob} = mountHeavyJob()
        heavyJob.track('job-1')
        const es = MockEventSource.instances[0]
        for (let i = 0; i < 5; i++) es.emitError(MockEventSource.CONNECTING)
        expect(heavyJob.sseFailed.value).toBe(true)
    })

    it('reset()은 이전 연결을 닫고 상태를 초기화한다', () => {
        const {heavyJob} = mountHeavyJob()
        heavyJob.track('job-1')
        const es = MockEventSource.instances[0]
        heavyJob.reset()
        expect(es.closeSpy).toHaveBeenCalled()
        expect(heavyJob.jobId.value).toBeNull()
        expect(heavyJob.progress.value).toBeNull()
    })

    it('track()을 다시 호출하면 이전 연결을 닫고 새 연결을 연다', () => {
        const {heavyJob} = mountHeavyJob()
        heavyJob.track('job-1')
        const first = MockEventSource.instances[0]
        heavyJob.track('job-2')
        expect(first.closeSpy).toHaveBeenCalled()
        expect(MockEventSource.instances).toHaveLength(2)
        expect(heavyJob.jobId.value).toBe('job-2')
    })

    describe('043: 전역 Job 추적 store 등록', () => {
        it('moduleId·moduleName을 함께 넘기면 전역 store에도 등록한다', () => {
            const {heavyJob} = mountHeavyJob()
            heavyJob.track('job-1', 'pdf-password', 'PDF 비밀번호 설정/해제')
            expect(mockTrackActiveJob).toHaveBeenCalledWith('job-1', 'pdf-password', 'PDF 비밀번호 설정/해제')
        })

        it('moduleId·moduleName 없이 호출하면(레거시 호출부) 전역 store를 건드리지 않는다', () => {
            const {heavyJob} = mountHeavyJob()
            heavyJob.track('job-1')
            expect(mockTrackActiveJob).not.toHaveBeenCalled()
        })
    })
})
