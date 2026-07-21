import {onUnmounted, ref} from 'vue'
import {apiClient} from '../api/client'
import {useActiveJobs} from './useActiveJobs'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'
const SSE_MAX_CONSECUTIVE_ERRORS = 5

export interface HeavyJobProgress {
    queuePosition: number
    progress: number
    etaSeconds: number | null
}

export interface HeavyJobResult {
    url: string | null
    text: string | null
}

/**
 * 단건 Heavy Job(업로드 → SSE 폴링 → 결과 조회) 추적 로직.
 * ToolPage.vue의 동일 로직(888~1055행)을 그대로 이식했다 — ToolPage.vue는 이미 테스트된 채로
 * 남겨두고 건드리지 않으며, 이 composable은 isFrontendOnly 커스텀 페이지 전용으로만 쓴다.
 */
export function useHeavyJob() {
    const {track: trackActiveJob} = useActiveJobs()
    const jobId = ref<string | null>(null)
    const progress = ref<HeavyJobProgress | null>(null)
    const reconnecting = ref(false)
    const sseFailed = ref(false)
    const failed = ref(false)
    const result = ref<HeavyJobResult | null>(null)

    let eventSource: EventSource | null = null
    let errorCount = 0

    function stop() {
        eventSource?.close()
        eventSource = null
    }

    function reset() {
        stop()
        jobId.value = null
        progress.value = null
        reconnecting.value = false
        sseFailed.value = false
        failed.value = false
        result.value = null
    }

    async function fetchResult(id: string) {
        try {
            const {data} = await apiClient.get(`/api/v1/jobs/${id}/result`)
            result.value = {url: data.url ?? null, text: data.text ?? null}
        } catch {
            result.value = {url: null, text: '결과를 불러오지 못했습니다.'}
        }
    }

    /**
     * jobId를 받아 SSE 추적을 시작한다. jobId 출처(FileUploader 업로드든, 파라미터만 보내는 직접 호출이든)는 상관하지 않는다.
     * moduleId·moduleName을 함께 넘기면 043 전역 Job 추적 store에도 등록해, 이 페이지를 벗어나도
     * 사이드바 "내 작업" 패널에서 계속 진행 상황을 볼 수 있게 한다(호출부는 onUploaded와 동일한 지점).
     * 이 페이지 자신의 실시간 표시(progress 등)는 이 함수가 여는 별도 SSE 연결로 그대로 처리한다 —
     * 전역 store는 자신만의 연결을 독립적으로 열고 백그라운드에서 추적한다(ToolPage와 동일한 트레이드오프).
     */
    function track(id: string, moduleId?: string, moduleName?: string) {
        reset()
        jobId.value = id
        errorCount = 0

        if (moduleId && moduleName) {
            trackActiveJob(id, moduleId, moduleName)
        }

        const es = new EventSource(`${API_BASE}/api/v1/jobs/${id}/stream`)
        eventSource = es
        es.addEventListener('job-status-changed', (e: MessageEvent) => {
            const d = JSON.parse(e.data)
            errorCount = 0
            reconnecting.value = false
            progress.value = {
                queuePosition: d.queuePosition ?? 0,
                progress: d.progress ?? 0,
                etaSeconds: d.etaSeconds ?? null,
            }
            if (d.status === 'DONE' || d.status === 'FAILED') {
                stop()
                if (d.status === 'DONE') {
                    fetchResult(id)
                } else {
                    failed.value = true
                    result.value = {url: null, text: '처리에 실패했습니다.'}
                }
            }
        })
        es.onerror = () => {
            errorCount += 1
            // CLOSED: 네이티브가 재연결을 완전히 포기한 상태 — 더 이상 onerror가 안 불릴 것이므로
            // 카운트가 상한에 도달할 기회 자체가 없다. 즉시 실패 처리.
            const gaveUp = es.readyState === EventSource.CLOSED
            if (gaveUp || errorCount >= SSE_MAX_CONSECUTIVE_ERRORS) {
                reconnecting.value = false
                sseFailed.value = true
                stop()
                return
            }
            reconnecting.value = true
        }
    }

    onUnmounted(stop)

    return {jobId, progress, reconnecting, sseFailed, failed, result, track, reset}
}
