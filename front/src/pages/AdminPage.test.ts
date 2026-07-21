import {beforeEach, describe, expect, it, vi} from 'vitest'
import {flushPromises, mount} from '@vue/test-utils'
import AdminPage from './AdminPage.vue'
import {apiClient} from '../api/client'

vi.mock('../api/client', () => ({
    apiClient: {get: vi.fn(), delete: vi.fn()},
}))

const mockGet = apiClient.get as ReturnType<typeof vi.fn>

function mockAdminEndpoints() {
    mockGet.mockImplementation((url: string) => {
        if (url === '/admin/stats') return Promise.resolve({data: []})
        if (url === '/admin/suggestions') return Promise.resolve({data: []})
        if (url === '/admin/comments') {
            return Promise.resolve({
                data: [{id: 1, moduleId: 'sha256', content: '좋은 도구네요', createdAt: '2026-07-11T10:00:00'}],
            })
        }
        if (url === '/admin/action-logs') {
            return Promise.resolve({
                data: {
                    content: [
                        {id: 1, actionType: 'COMMENT_DELETE', targetId: 5, performedAt: '2026-07-21T09:00:00'},
                    ],
                    totalElements: 1,
                    totalPages: 1,
                    page: 0,
                },
            })
        }
        return Promise.reject(new Error('unexpected GET ' + url))
    })
}

async function loginAsAdmin(wrapper: ReturnType<typeof mount>) {
    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('admin')
    await inputs[1].setValue('password')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
}

beforeEach(() => {
    vi.clearAllMocks()
    // 이전 테스트의 로그인이 세션스토리지에 admin_auth를 남기면, 다음 테스트의 mount()가 자동
    // 로그인 microtask를 실행해 로그인 폼이 사라지기 전에 loginAsAdmin이 form을 찾다가 실패한다.
    sessionStorage.clear()
})

describe('AdminPage 댓글 관리', () => {
    it('운영 탭으로 전환하면 전체 댓글 목록을 불러와 모듈 id와 함께 렌더링한다', async () => {
        mockAdminEndpoints()

        const wrapper = mount(AdminPage)
        await loginAsAdmin(wrapper)

        // 댓글 관리는 "운영" 탭 안에 있다 — 관리자 화면이 3탭(통계/유저 관리/운영) 구조로
        // 리팩터링되면서 탭별 지연 로딩이 됐다(AI_SYNC.md 2026-07-18).
        const opsTab = wrapper.findAll('button').find(b => b.text().includes('운영'))
        await opsTab?.trigger('click')
        await flushPromises()

        expect(mockGet).toHaveBeenCalledWith('/admin/comments', expect.anything())
        expect(wrapper.text()).toContain('좋은 도구네요')
        expect(wrapper.text()).toContain('sha256')
    })
})

describe('AdminPage 관리자 액션 로그', () => {
    it('운영 탭으로 전환하면 액션 로그 목록을 불러와 액션 타입·대상 id와 함께 렌더링한다', async () => {
        mockAdminEndpoints()

        const wrapper = mount(AdminPage)
        await loginAsAdmin(wrapper)

        const opsTab = wrapper.findAll('button').find(b => b.text().includes('운영'))
        await opsTab?.trigger('click')
        await flushPromises()

        expect(mockGet).toHaveBeenCalledWith('/admin/action-logs', expect.anything())
        expect(wrapper.text()).toContain('COMMENT_DELETE')
        expect(wrapper.text()).toContain('5')
    })
})
