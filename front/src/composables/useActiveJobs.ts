import {ref} from 'vue'
import {toast} from 'vue-sonner'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'
const STORAGE_KEY = 'devtoolbox-active-jobs'
// 무한정 쌓이지 않도록 상한을 둔다 — 오래된 항목(완료 포함)부터 밀려난다.
const MAX_JOBS = 20

export type ActiveJobStatus = 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED'

export interface ActiveJob {
    jobId: string
    moduleId: string
    moduleName: string
    status: ActiveJobStatus
    progress: number
    queuePosition: number
    startedAt: number
}

function load(): ActiveJob[] {
    try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as ActiveJob[]
        return Array.isArray(stored) ? stored : []
    } catch {
        return []
    }
}

/**
 * 043: 페이지(ToolPage)를 벗어나도 Heavy Job 추적이 끊기지 않도록 하는 전역 store.
 * localStorage에만 저장하며(로그인 여부 무관, 기기 이동은 추적하지 않는 트레이드오프 수용),
 * 모듈이 로드되는 순간(=앱이 뜨는 순간) 진행 중이던 Job의 SSE 연결을 즉시 복구한다.
 * ToolPage.vue의 로컬 상태(resetAll 등)와는 완전히 독립적 — resetAll은 이 store를 건드리지 않는다.
 */
const jobs = ref<ActiveJob[]>(load())
const connections = new Map<string, EventSource>()

function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs.value))
}

function closeConnection(jobId: string) {
    connections.get(jobId)?.close()
    connections.delete(jobId)
}

function patchJob(jobId: string, patch: Partial<ActiveJob>) {
    const idx = jobs.value.findIndex(j => j.jobId === jobId)
    if (idx === -1) return
    const next = [...jobs.value]
    next[idx] = {...next[idx], ...patch}
    jobs.value = next
    persist()
}

function connect(jobId: string) {
    if (connections.has(jobId)) return
    const es = new EventSource(`${API_BASE}/api/v1/jobs/${jobId}/stream`)
    connections.set(jobId, es)
    es.addEventListener('job-status-changed', (e: MessageEvent) => {
        const d = JSON.parse(e.data)
        const status = (d.status ?? 'RUNNING') as ActiveJobStatus
        patchJob(jobId, {
            status,
            progress: d.progress ?? 0,
            queuePosition: d.queuePosition ?? 0,
        })
        if (status === 'DONE' || status === 'FAILED') {
            closeConnection(jobId)
            const name = jobs.value.find(j => j.jobId === jobId)?.moduleName ?? '작업'
            if (status === 'DONE') {
                toast.success(`${name} 처리가 완료되었습니다.`)
            } else {
                toast.error(`${name} 처리에 실패했습니다.`)
            }
        }
    })
    // 백그라운드 추적은 페이지 이동 중일 수 있어 즉각적인 실패 UI가 필요 없다 —
    // 네이티브 EventSource의 자동 재연결에 맡기고 조용히 넘어간다(ToolPage의 sseFailed와는 다른 관심사).
    es.onerror = () => {}
}

/** 새로 시작된 Heavy Job을 전역 추적에 등록한다. 같은 jobId가 이미 있으면 무시(중복 방지). */
function track(jobId: string, moduleId: string, moduleName: string) {
    if (jobs.value.some(j => j.jobId === jobId)) return
    const job: ActiveJob = {
        jobId,
        moduleId,
        moduleName,
        status: 'PENDING',
        progress: 0,
        queuePosition: 0,
        startedAt: Date.now(),
    }
    jobs.value = [job, ...jobs.value].slice(0, MAX_JOBS)
    persist()
    connect(jobId)
}

/** 목록에서 제거한다(완료/실패 항목을 사용자가 직접 지울 때 사용). */
function dismiss(jobId: string) {
    closeConnection(jobId)
    jobs.value = jobs.value.filter(j => j.jobId !== jobId)
    persist()
}

/** 새로고침·재방문 시 아직 끝나지 않은 Job들의 SSE를 다시 연결한다. */
function resumeAll() {
    for (const job of jobs.value) {
        if (job.status !== 'DONE' && job.status !== 'FAILED') {
            connect(job.jobId)
        }
    }
}

resumeAll()

export function useActiveJobs() {
    return {jobs, track, dismiss}
}
