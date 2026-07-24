import {beforeEach, describe, expect, it, vi} from 'vitest'
import {flushPromises, mount} from '@vue/test-utils'
import CommentSection from './CommentSection.vue'
import {apiClient} from '@/api/client'
import {accessToken, user} from '@/composables/useAuth'

vi.mock('@/api/client', () => ({
    apiClient: {get: vi.fn(), post: vi.fn(), delete: vi.fn()},
}))

const mockGet = apiClient.get as ReturnType<typeof vi.fn>

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
        user.value = {id: 1, provider: 'GOOGLE', nickname: '나', email: null, createdAt: '2026-01-01T00:00:00'}

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
