import {describe, expect, it, vi} from 'vitest'
import {flushPromises, mount} from '@vue/test-utils'
import {createMemoryHistory, createRouter} from 'vue-router'
import JobHistorySection from './JobHistorySection.vue'
import {apiClient} from '@/api/client'

vi.mock('@/api/client', () => ({
    apiClient: {get: vi.fn()},
}))

const mockGet = apiClient.get as ReturnType<typeof vi.fn>

function createTestRouter() {
    return createRouter({
        history: createMemoryHistory(),
        routes: [
            {path: '/', component: {template: '<div/>'}},
            {path: '/tools/:moduleId', component: {template: '<div/>'}},
        ],
    })
}

interface JobOverrides {
    id?: string
    moduleId?: string
    status?: 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED'
    createdAt?: string
    expired?: boolean
    downloadUrl?: string | null
}

function job(overrides: JobOverrides = {}) {
    return {
        id: 'job-1111-2222',
        moduleId: 'pdf-merge',
        status: 'DONE' as const,
        createdAt: '2026-07-20T10:00:00',
        expired: false,
        downloadUrl: '/api/v1/files/job-1111/result.pdf',
        ...overrides,
    }
}

async function mountWithJobs(jobs: ReturnType<typeof job>[]) {
    mockGet.mockResolvedValueOnce({
        data: {content: jobs, totalElements: jobs.length, totalPages: 1, page: 0},
    })
    const router = createTestRouter()
    await router.push('/')
    const wrapper = mount(JobHistorySection, {global: {plugins: [router]}})
    await flushPromises()
    return {wrapper, router}
}

describe('JobHistorySection — 다시 열기 / 결과 다운로드', () => {
    it('만료된 DONE 작업은 "다시 열기"는 보이고 다운로드 버튼은 숨겨진다', async () => {
        const {wrapper} = await mountWithJobs([job({status: 'DONE', expired: true, downloadUrl: null})])

        expect(wrapper.find('[data-testid="job-history-reopen"]').exists()).toBe(true)
        expect(wrapper.find('[data-testid="job-history-download"]').exists()).toBe(false)
        expect(wrapper.text()).toContain('결과 보관 기간 만료')
    })

    it('만료되지 않은 DONE 작업은 "다시 열기"와 다운로드 버튼 둘 다 보인다', async () => {
        const {wrapper} = await mountWithJobs([job({status: 'DONE', expired: false, downloadUrl: '/api/v1/files/x/result.pdf'})])

        const reopen = wrapper.find('[data-testid="job-history-reopen"]')
        const download = wrapper.find('[data-testid="job-history-download"]')
        expect(reopen.exists()).toBe(true)
        expect(download.exists()).toBe(true)
        expect(download.attributes('href')).toBe('/api/v1/files/x/result.pdf')
    })

    it('FAILED 작업은 "다시 열기"만 보이고 다운로드 버튼은 없다', async () => {
        const {wrapper} = await mountWithJobs([job({status: 'FAILED', expired: false, downloadUrl: null})])

        expect(wrapper.find('[data-testid="job-history-reopen"]').exists()).toBe(true)
        expect(wrapper.find('[data-testid="job-history-download"]').exists()).toBe(false)
    })

    it('카탈로그에 없는 moduleId는 "다시 열기" 버튼이 숨겨지고 에러 없이 렌더링된다', async () => {
        const {wrapper} = await mountWithJobs([job({status: 'DONE', expired: true, moduleId: 'removed-tool-xyz', downloadUrl: null})])

        expect(wrapper.find('[data-testid="job-history-reopen"]').exists()).toBe(false)
    })

    it('"다시 열기" 링크는 해당 도구 페이지(/tools/{moduleId})로 정확히 이동한다', async () => {
        const {wrapper, router} = await mountWithJobs([job({moduleId: 'pdf-merge', status: 'DONE', expired: true, downloadUrl: null})])

        await wrapper.find('[data-testid="job-history-reopen"]').trigger('click')
        await flushPromises()

        expect(router.currentRoute.value.fullPath).toBe('/tools/pdf-merge')
    })
})
