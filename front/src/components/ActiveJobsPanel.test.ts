import {describe, expect, it, vi} from 'vitest'
import {mount} from '@vue/test-utils'
import {ref} from 'vue'
import ActiveJobsPanel from './ActiveJobsPanel.vue'
import type {ActiveJob} from '../composables/useActiveJobs'

const mockDismiss = vi.fn()
const mockJobs = ref<ActiveJob[]>([])

vi.mock('../composables/useActiveJobs', () => ({
    useActiveJobs: () => ({jobs: mockJobs, track: vi.fn(), dismiss: mockDismiss}),
}))

function job(overrides: Partial<ActiveJob>): ActiveJob {
    return {
        jobId: 'job-1', moduleId: 'pdf-merge', moduleName: 'PDF 병합',
        status: 'RUNNING', progress: 0, queuePosition: 0, startedAt: Date.now(),
        downloadUrl: null, expiresAt: null,
        ...overrides,
    }
}

describe('ActiveJobsPanel', () => {
    it('추적 중인 작업이 없으면 빈 상태 안내를 보여준다', () => {
        mockJobs.value = []
        const wrapper = mount(ActiveJobsPanel)

        expect(wrapper.text()).toContain('진행 중인 백그라운드 작업이 없습니다')
        expect(wrapper.findAll('[data-testid="active-job-item"]')).toHaveLength(0)
    })

    it('진행 중인 Job의 모듈명과 진행 상태를 표시한다', () => {
        mockJobs.value = [job({moduleName: 'PDF 병합', status: 'RUNNING', progress: 42})]
        const wrapper = mount(ActiveJobsPanel)

        const items = wrapper.findAll('[data-testid="active-job-item"]')
        expect(items).toHaveLength(1)
        expect(items[0].text()).toContain('PDF 병합')
        expect(items[0].text()).toContain('42%')
    })

    it('완료(DONE)된 Job에는 지우기 버튼이 있고 클릭하면 dismiss()를 호출한다', async () => {
        mockDismiss.mockClear()
        mockJobs.value = [job({jobId: 'job-done', status: 'DONE'})]
        const wrapper = mount(ActiveJobsPanel)

        const dismissBtn = wrapper.find('[data-testid="active-job-dismiss"]')
        expect(dismissBtn.exists()).toBe(true)
        await dismissBtn.trigger('click')

        expect(mockDismiss).toHaveBeenCalledWith('job-done')
    })

    it('진행 중(RUNNING/PENDING)인 Job에는 지우기 버튼이 없다', () => {
        mockJobs.value = [job({status: 'PENDING'})]
        const wrapper = mount(ActiveJobsPanel)

        expect(wrapper.find('[data-testid="active-job-dismiss"]').exists()).toBe(false)
    })

    it('실패(FAILED)한 Job은 실패 상태를 표시한다', () => {
        mockJobs.value = [job({moduleName: '이미지 변환', status: 'FAILED'})]
        const wrapper = mount(ActiveJobsPanel)

        expect(wrapper.text()).toContain('이미지 변환')
        expect(wrapper.text()).toContain('실패')
    })

    it('DONE + 만료 전: 다운로드 버튼이 표시되고 href가 downloadUrl과 일치하며, 만료 안내 문구도 보인다', () => {
        const future = new Date(Date.now() + 30 * 60_000).toISOString()
        mockJobs.value = [job({
            jobId: 'job-done', status: 'DONE',
            downloadUrl: 'https://files.example/job-done.pdf', expiresAt: future,
        })]
        const wrapper = mount(ActiveJobsPanel)

        const downloadLink = wrapper.find('[data-testid="active-job-download"]')
        expect(downloadLink.exists()).toBe(true)
        expect(downloadLink.attributes('href')).toBe('https://files.example/job-done.pdf')
        expect(wrapper.text()).toContain('만료까지')
        // 다운로드 버튼이 있어도 지우기 버튼은 그대로 유지된다(둘 다 필요 — 이슈 명세).
        expect(wrapper.find('[data-testid="active-job-dismiss"]').exists()).toBe(true)
    })

    it('DONE + 만료 후: downloadUrl이 있어도 다운로드 버튼이 없다', () => {
        const past = new Date(Date.now() - 60_000).toISOString()
        mockJobs.value = [job({
            jobId: 'job-expired', status: 'DONE',
            downloadUrl: 'https://files.example/job-expired.pdf', expiresAt: past,
        })]
        const wrapper = mount(ActiveJobsPanel)

        expect(wrapper.find('[data-testid="active-job-download"]').exists()).toBe(false)
        expect(wrapper.text()).not.toContain('만료까지')
        // 다운로드는 못 해도 지우기는 여전히 가능해야 한다.
        expect(wrapper.find('[data-testid="active-job-dismiss"]').exists()).toBe(true)
    })

    it('FAILED 상태는 다운로드 버튼이 없고 지우기 버튼은 유지된다(회귀 없음)', () => {
        mockJobs.value = [job({jobId: 'job-failed', status: 'FAILED'})]
        const wrapper = mount(ActiveJobsPanel)

        expect(wrapper.find('[data-testid="active-job-download"]').exists()).toBe(false)
        expect(wrapper.find('[data-testid="active-job-dismiss"]').exists()).toBe(true)
    })

    it('추적 중인 작업이 있으면 페이지 이동해도 안전하다는 안내 문구를 항상 보여준다', () => {
        mockJobs.value = [job({status: 'RUNNING'})]
        const wrapper = mount(ActiveJobsPanel)

        expect(wrapper.text()).toContain('다른 페이지로 이동해도 진행 상황이 유지됩니다')
    })

    it('추적 중인 작업이 없으면 이동 안내 문구를 보여주지 않는다', () => {
        mockJobs.value = []
        const wrapper = mount(ActiveJobsPanel)

        expect(wrapper.text()).not.toContain('다른 페이지로 이동해도 진행 상황이 유지됩니다')
    })
})
