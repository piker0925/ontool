import {beforeEach, describe, expect, it, vi} from 'vitest'
import {flushPromises, mount} from '@vue/test-utils'
import CommentSection from './CommentSection.vue'
import {apiClient} from '@/api/client'
import {accessToken, user} from '@/composables/useAuth'

vi.mock('@/api/client', () => ({
    apiClient: {get: vi.fn(), post: vi.fn(), delete: vi.fn()},
}))

const mockGet = apiClient.get as ReturnType<typeof vi.fn>
const mockPost = apiClient.post as ReturnType<typeof vi.fn>

const ONE_COMMENT = [
    {id: 1, content: '좋은 도구네요', createdAt: '2026-07-20T10:00:00', nickname: 'writer'},
]

async function mountAndOpenReport() {
    accessToken.value = 'token'
    user.value = {id: 1, provider: 'GOOGLE', nickname: 'tester', email: null, createdAt: '2026-07-01T00:00:00', status: 'ACTIVE'}
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
    accessToken.value = null
    user.value = null
})

describe('CommentSection 폼 접근성', () => {
    it('댓글 작성 Textarea에 aria-label="댓글 내용"이 있다', async () => {
        mockGet.mockResolvedValue({data: []})

        const wrapper = mount(CommentSection, {props: {moduleId: 'sha256'}})
        await flushPromises()

        const textarea = wrapper.find('textarea[aria-label="댓글 내용"]')
        expect(textarea.exists()).toBe(true)
    })

    it('로그인 상태에서 신고 폼을 열고 "기타" 사유를 선택하면 상세 사유 Textarea에 aria-label="신고 상세 사유"가 있다', async () => {
        mockGet.mockResolvedValue({
            data: [{id: 1, content: '댓글 내용', createdAt: '2026-07-01T00:00:00', nickname: '작성자'}],
        })
        accessToken.value = 'token'
        user.value = {id: 1, provider: 'GOOGLE', nickname: '나', email: null, createdAt: '2026-01-01T00:00:00', status: 'ACTIVE'}

        const wrapper = mount(CommentSection, {props: {moduleId: 'sha256'}})
        await flushPromises()

        // 신고 상세 Textarea는 사유가 "기타"일 때만 렌더링된다 — 신고 폼을 연 뒤 기타를 선택해야 나타난다.
        const reportBtn = wrapper.findAll('button').find(b => b.text().includes('신고'))
        await reportBtn?.trigger('click')
        const otherReasonBtn = wrapper.findAll('button').find(b => b.text() === '기타')
        await otherReasonBtn?.trigger('click')

        const detailTextarea = wrapper.find('textarea[aria-label="신고 상세 사유"]')
        expect(detailTextarea.exists()).toBe(true)
    })
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

describe('CommentSection 댓글 등록 실패 — 056 정지 사유 표시', () => {
    async function mountAndTypeComment() {
        accessToken.value = 'token'
        user.value = {id: 1, provider: 'GOOGLE', nickname: 'tester', email: null, createdAt: '2026-07-01T00:00:00', status: 'ACTIVE'}
        mockGet.mockResolvedValueOnce({data: []})
        const wrapper = mount(CommentSection, {props: {moduleId: 'sha256'}})
        await flushPromises()

        await wrapper.find('textarea[aria-label="댓글 내용"]').setValue('테스트 댓글')
        const submitBtn = wrapper.findAll('button').find(b => b.text() === '댓글 등록')
        return {wrapper, submitBtn}
    }

    it('정지된 유저가 작성 시도하면 서버가 내려준 정지 사유 메시지를 그대로 보여준다(침묵 실패 아님)', async () => {
        mockPost.mockRejectedValueOnce({
            response: {status: 403, data: {code: 'USER_SUSPENDED', message: '정지된 계정은 댓글을 작성할 수 없습니다.'}},
        })
        const {wrapper, submitBtn} = await mountAndTypeComment()

        await submitBtn?.trigger('click')
        await flushPromises()

        expect(wrapper.text()).toContain('정지된 계정은 댓글을 작성할 수 없습니다.')
        const banner = wrapper.find('[role="alert"]')
        expect(banner.exists()).toBe(true)
    })

    it('그 외 사유로 작성 실패하면 일반 실패 메시지를 보여준다(회귀 없음 — 침묵 실패로 되돌아가지 않음)', async () => {
        mockPost.mockRejectedValueOnce({response: {status: 500}})
        const {wrapper, submitBtn} = await mountAndTypeComment()

        await submitBtn?.trigger('click')
        await flushPromises()

        expect(wrapper.text()).toContain('댓글 등록에 실패했습니다.')
        expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    })

    it('작성에 성공하면 에러 배너 없이 목록이 갱신된다(정상 경로 회귀 없음)', async () => {
        mockPost.mockResolvedValueOnce({})
        const {wrapper, submitBtn} = await mountAndTypeComment()
        mockGet.mockResolvedValueOnce({data: ONE_COMMENT})

        await submitBtn?.trigger('click')
        await flushPromises()

        expect(wrapper.find('[role="alert"]').exists()).toBe(false)
        expect(wrapper.text()).toContain('좋은 도구네요')
    })
})
