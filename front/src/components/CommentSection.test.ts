import {beforeEach, describe, expect, it, vi} from 'vitest'
import {flushPromises, mount} from '@vue/test-utils'
import CommentSection from './CommentSection.vue'
import {apiClient} from '@/api/client'

vi.mock('@/api/client', () => ({
    apiClient: {get: vi.fn(), post: vi.fn(), delete: vi.fn()},
}))

vi.mock('@/composables/useAuth', () => ({
    useAuth: () => ({
        isLoggedIn: true,
        user: {id: 1, nickname: 'tester', provider: 'GOOGLE', email: null, createdAt: '2026-07-01T00:00:00'},
    }),
}))

const mockGet = apiClient.get as ReturnType<typeof vi.fn>
const mockPost = apiClient.post as ReturnType<typeof vi.fn>

const ONE_COMMENT = [
    {id: 1, content: '좋은 도구네요', createdAt: '2026-07-20T10:00:00', nickname: 'writer'},
]

async function mountAndOpenReport() {
    mockGet.mockResolvedValueOnce({data: ONE_COMMENT})
    const wrapper = mount(CommentSection, {props: {moduleId: 'sha256'}})
    await flushPromises()

    const reportBtn = wrapper.findAll('button').find(b => b.text().includes('신고'))
    await reportBtn?.trigger('click')

    const submitBtn = wrapper.findAll('button').find(b => b.text() === '신고 접수')
    return {wrapper, submitBtn}
}

beforeEach(() => {
    vi.clearAllMocks()
})

describe('CommentSection 인라인 알림 배너 — aria-live', () => {
    it('신고 접수 성공 시 배너가 role=status, aria-live=polite로 렌더된다', async () => {
        mockPost.mockResolvedValueOnce({})
        const {wrapper, submitBtn} = await mountAndOpenReport()

        await submitBtn?.trigger('click')
        await flushPromises()

        expect(wrapper.text()).toContain('신고가 접수되었습니다.')
        const banner = wrapper.find('[role="status"]')
        expect(banner.exists()).toBe(true)
        expect(banner.attributes('aria-live')).toBe('polite')
    })

    it('신고 접수 실패(중복 409) 시 배너가 role=alert, aria-live=assertive로 렌더된다', async () => {
        mockPost.mockRejectedValueOnce({response: {status: 409}})
        const {wrapper, submitBtn} = await mountAndOpenReport()

        await submitBtn?.trigger('click')
        await flushPromises()

        expect(wrapper.text()).toContain('이미 신고한 댓글입니다.')
        const banner = wrapper.find('[role="alert"]')
        expect(banner.exists()).toBe(true)
        expect(banner.attributes('aria-live')).toBe('assertive')
    })
})
