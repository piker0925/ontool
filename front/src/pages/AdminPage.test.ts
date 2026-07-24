import {beforeEach, describe, expect, it, vi} from 'vitest'
import {flushPromises, mount} from '@vue/test-utils'
import {createMemoryHistory, createRouter} from 'vue-router'
import AdminPage from './AdminPage.vue'
import {apiClient} from '../api/client'

vi.mock('../api/client', () => ({
    apiClient: {get: vi.fn(), delete: vi.fn(), patch: vi.fn()},
}))

const mockGet = apiClient.get as ReturnType<typeof vi.fn>
const mockDelete = apiClient.delete as ReturnType<typeof vi.fn>
const mockPatch = apiClient.patch as ReturnType<typeof vi.fn>

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
        if (url.startsWith('/admin/comment-reports/users')) return Promise.resolve({data: []})
        if (url.startsWith('/admin/comment-reports')) {
            return Promise.resolve({data: {content: [], totalElements: 0, totalPages: 0, page: 0}})
        }
        return Promise.reject(new Error('unexpected GET ' + url))
    })
}

// 신고 목록에 댓글 1건(commentId: 5, reportId: 10)이 있는 상태를 흉내낸다 — "댓글 삭제" 버튼이
// 올바른 commentId/reportId로 apiClient.delete/patch를 호출하는지 검증하는 테스트 전용 설정.
function mockAdminEndpointsWithOneReport() {
    mockGet.mockImplementation((url: string) => {
        if (url === '/admin/stats') return Promise.resolve({data: []})
        if (url === '/admin/suggestions') return Promise.resolve({data: []})
        if (url === '/admin/comments') return Promise.resolve({data: []})
        if (url === '/admin/action-logs') {
            return Promise.resolve({data: {content: [], totalElements: 0, totalPages: 0, page: 0}})
        }
        if (url.startsWith('/admin/comment-reports/users')) return Promise.resolve({data: []})
        if (url.startsWith('/admin/comment-reports')) {
            return Promise.resolve({
                data: {
                    content: [{
                        id: 10, commentId: 5, commentContent: '신고당한 댓글', reason: 'SPAM', detail: null,
                        status: 'PENDING', reporterId: 2, reporterNickname: '신고자', createdAt: '2026-07-24T09:00:00',
                    }],
                    totalElements: 1, totalPages: 1, page: 0,
                },
            })
        }
        return Promise.reject(new Error('unexpected GET ' + url))
    })
}

function newRouter() {
    return createRouter({
        history: createMemoryHistory(),
        routes: [{path: '/admin', component: AdminPage}],
    })
}

async function mountAdminPage(router: ReturnType<typeof newRouter> = newRouter(), initialQuery?: Record<string, string>) {
    if (initialQuery) await router.push({path: '/admin', query: initialQuery})
    else await router.push('/admin')
    return mount(AdminPage, {global: {plugins: [router]}})
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

describe('AdminPage 로그인 폼 접근성', () => {
    it('아이디/비밀번호 입력에 각각 aria-label이 있다', async () => {
        mockAdminEndpoints()

        const wrapper = await mountAdminPage()
        const inputs = wrapper.findAll('input')

        expect(inputs[0].attributes('aria-label')).toBe('사용자명')
        expect(inputs[1].attributes('aria-label')).toBe('비밀번호')
    })
})

describe('AdminPage 로그인 실패 배너 — aria-live', () => {
    it('로그인 실패 시 에러 배너가 role=alert, aria-live=assertive로 렌더된다', async () => {
        mockGet.mockRejectedValueOnce(new Error('unauthorized'))

        const wrapper = await mountAdminPage()
        const inputs = wrapper.findAll('input')
        await inputs[0].setValue('admin')
        await inputs[1].setValue('wrong-password')
        await wrapper.find('form').trigger('submit')
        await flushPromises()

        expect(wrapper.text()).toContain('인증 실패')
        const banner = wrapper.find('[role="alert"]')
        expect(banner.exists()).toBe(true)
        expect(banner.attributes('aria-live')).toBe('assertive')
    })
})

describe('AdminPage 유저 검색 입력', () => {
    it('닉네임/제공자 검색 입력에 autocomplete="off"가 지정돼 있다 — 브라우저 자동완성 제안 방지', async () => {
        mockGet.mockImplementation((url: string) => {
            if (url === '/admin/stats') return Promise.resolve({data: []})
            if (url.startsWith('/admin/users')) return Promise.resolve({data: {content: [], totalElements: 0, totalPages: 0, page: 0}})
            return Promise.reject(new Error('unexpected GET ' + url))
        })

        const wrapper = await mountAdminPage()
        await loginAsAdmin(wrapper)
        const usersTab = wrapper.findAll('button').find(b => b.text().includes('유저 관리'))
        await usersTab?.trigger('click')
        await flushPromises()

        const searchInput = wrapper.find('input[placeholder*="검색"]')
        expect(searchInput.exists()).toBe(true)
        expect(searchInput.attributes('autocomplete')).toBe('off')
    })
})

describe('AdminPage 댓글 관리', () => {
    it('운영 탭으로 전환하면 전체 댓글 목록을 불러와 모듈 id와 함께 렌더링한다', async () => {
        mockAdminEndpoints()

        const wrapper = await mountAdminPage()
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

        const wrapper = await mountAdminPage()
        await loginAsAdmin(wrapper)

        const opsTab = wrapper.findAll('button').find(b => b.text().includes('운영'))
        await opsTab?.trigger('click')
        await flushPromises()

        expect(mockGet).toHaveBeenCalledWith('/admin/action-logs', expect.anything())
        expect(wrapper.text()).toContain('COMMENT_DELETE')
        expect(wrapper.text()).toContain('5')
    })
})

describe('AdminPage 탭-URL 동기화', () => {
    it('탭을 전환하면 URL 쿼리(tab)가 바뀌고, 새로고침을 흉내내도(같은 쿼리로 재마운트) 그 탭이 유지된다', async () => {
        mockAdminEndpoints()
        const router = newRouter()

        const wrapper = await mountAdminPage(router)
        await loginAsAdmin(wrapper)

        // 기본값은 통계 탭 — 쿼리가 없다.
        expect(router.currentRoute.value.query.tab).toBeUndefined()

        const opsTab = wrapper.findAll('button').find(b => b.text().includes('운영'))
        await opsTab?.trigger('click')
        await flushPromises()

        expect(router.currentRoute.value.query.tab).toBe('ops')

        // 재마운트(새로고침 흉내) — sessionStorage에 남은 admin_auth로 자동 로그인되고(실제 새로고침과 동일),
        // 같은 쿼리로 열면 통계가 아니라 운영 탭이 바로 보여야 한다.
        wrapper.unmount()
        const reloaded = await mountAdminPage(newRouter(), {tab: 'ops'})
        await flushPromises()

        expect(mockGet).toHaveBeenCalledWith('/admin/action-logs', expect.anything())
        // 통계 탭의 "모듈 통계" 제목은 안 보이고, 운영 탭 내용만 보여야 한다(기본값 stats로 되돌아가지 않았다는 대조 확인).
        expect(reloaded.text()).not.toContain('모듈 통계')
        expect(reloaded.text()).toContain('관리자 액션 로그')
    })

    it('알 수 없는 tab 쿼리값이면 기본값(통계) 탭으로 열린다', async () => {
        mockAdminEndpoints()

        const wrapper = await mountAdminPage(newRouter(), {tab: 'not-a-real-tab'})
        await loginAsAdmin(wrapper)

        expect(wrapper.text()).toContain('모듈 통계')
    })
})

describe('AdminPage 댓글 신고 목록 — 댓글 삭제 버튼', () => {
    async function openReportListWithConfirm() {
        mockAdminEndpointsWithOneReport()
        vi.spyOn(window, 'confirm').mockReturnValue(true)

        const wrapper = await mountAdminPage()
        await loginAsAdmin(wrapper)
        const opsTab = wrapper.findAll('button').find(b => b.text().includes('운영'))
        await opsTab?.trigger('click')
        await flushPromises()

        const deleteBtn = wrapper.findAll('button').find(b => b.text() === '댓글 삭제')
        return {wrapper, deleteBtn}
    }

    it('삭제에 성공하면 해당 댓글(id:5)을 지우고 그 신고(id:10)를 RESOLVED로 자동 전환한다', async () => {
        mockDelete.mockResolvedValueOnce({})
        mockPatch.mockResolvedValueOnce({})
        const {deleteBtn} = await openReportListWithConfirm()

        await deleteBtn?.trigger('click')
        await flushPromises()

        expect(mockDelete).toHaveBeenCalledWith('/admin/comments/5', expect.anything())
        // id가 뒤바뀌지 않았는지: PATCH 대상은 댓글 id(5)가 아니라 신고 id(10)여야 한다.
        expect(mockPatch).toHaveBeenCalledWith('/admin/comment-reports/10/status', {status: 'RESOLVED'}, expect.anything())
    })

    it('삭제에 실패하면 신고 상태를 전환하는 PATCH 요청 자체를 보내지 않는다', async () => {
        mockDelete.mockRejectedValueOnce(new Error('delete failed'))
        vi.spyOn(window, 'alert').mockImplementation(() => {})
        const {deleteBtn} = await openReportListWithConfirm()

        await deleteBtn?.trigger('click')
        await flushPromises()

        expect(mockDelete).toHaveBeenCalledWith('/admin/comments/5', expect.anything())
        expect(mockPatch).not.toHaveBeenCalled()
    })
})

describe('AdminPage 댓글 신고 목록 — 댓글 삭제 버튼 비활성화', () => {
    function mockAdminEndpointsWithReport(status: string) {
        mockGet.mockImplementation((url: string) => {
            if (url === '/admin/stats') return Promise.resolve({data: []})
            if (url === '/admin/suggestions') return Promise.resolve({data: []})
            if (url === '/admin/comments') return Promise.resolve({data: []})
            if (url === '/admin/action-logs') {
                return Promise.resolve({data: {content: [], totalElements: 0, totalPages: 0, page: 0}})
            }
            if (url.startsWith('/admin/comment-reports/users')) return Promise.resolve({data: []})
            if (url.startsWith('/admin/comment-reports')) {
                return Promise.resolve({
                    data: {
                        content: [{
                            id: 10, commentId: 5, commentContent: '신고당한 댓글', reason: 'SPAM', detail: null,
                            status, reporterId: 2, reporterNickname: '신고자', createdAt: '2026-07-24T09:00:00',
                        }],
                        totalElements: 1, totalPages: 1, page: 0,
                    },
                })
            }
            return Promise.reject(new Error('unexpected GET ' + url))
        })
    }

    async function openReportList() {
        const wrapper = await mountAdminPage()
        await loginAsAdmin(wrapper)
        const opsTab = wrapper.findAll('button').find(b => b.text().includes('운영'))
        await opsTab?.trigger('click')
        await flushPromises()
        return wrapper
    }

    it('신고가 RESOLVED 상태면 댓글 삭제 버튼이 비활성화된다 — 이미 삭제된 댓글을 다시 삭제 시도하지 못하게 함', async () => {
        mockAdminEndpointsWithReport('RESOLVED')
        const wrapper = await openReportList()

        const deleteBtn = wrapper.findAll('button').find(b => b.text() === '댓글 삭제')
        expect(deleteBtn?.attributes('disabled')).toBeDefined()
    })

    it('신고가 DISMISSED 상태면 댓글 삭제 버튼은 여전히 활성화된다 — RESOLVED일 때만 비활성화되는 것이지 처리 완료 전반이 아니다', async () => {
        mockAdminEndpointsWithReport('DISMISSED')
        const wrapper = await openReportList()

        const deleteBtn = wrapper.findAll('button').find(b => b.text() === '댓글 삭제')
        expect(deleteBtn?.attributes('disabled')).toBeUndefined()
    })

    it('댓글 삭제 성공 후(자동 RESOLVED 전환 + 목록 재조회) 같은 신고의 댓글 삭제 버튼이 비활성화된다', async () => {
        let reportGetCount = 0
        mockGet.mockImplementation((url: string) => {
            if (url === '/admin/stats') return Promise.resolve({data: []})
            if (url === '/admin/suggestions') return Promise.resolve({data: []})
            if (url === '/admin/comments') return Promise.resolve({data: []})
            if (url === '/admin/action-logs') {
                return Promise.resolve({data: {content: [], totalElements: 0, totalPages: 0, page: 0}})
            }
            if (url.startsWith('/admin/comment-reports/users')) return Promise.resolve({data: []})
            if (url.startsWith('/admin/comment-reports')) {
                reportGetCount++
                return Promise.resolve({
                    data: {
                        content: [{
                            id: 10, commentId: 5, commentContent: '신고당한 댓글', reason: 'SPAM', detail: null,
                            status: reportGetCount === 1 ? 'PENDING' : 'RESOLVED',
                            reporterId: 2, reporterNickname: '신고자', createdAt: '2026-07-24T09:00:00',
                        }],
                        totalElements: 1, totalPages: 1, page: 0,
                    },
                })
            }
            return Promise.reject(new Error('unexpected GET ' + url))
        })
        vi.spyOn(window, 'confirm').mockReturnValue(true)
        mockDelete.mockResolvedValueOnce({})
        mockPatch.mockResolvedValueOnce({})

        const wrapper = await openReportList()

        const deleteBtnBefore = wrapper.findAll('button').find(b => b.text() === '댓글 삭제')
        expect(deleteBtnBefore?.attributes('disabled')).toBeUndefined()

        await deleteBtnBefore?.trigger('click')
        await flushPromises()

        const deleteBtnAfter = wrapper.findAll('button').find(b => b.text() === '댓글 삭제')
        expect(deleteBtnAfter?.attributes('disabled')).toBeDefined()
    })
})
