import {beforeEach, describe, expect, it, vi} from 'vitest'
import {mount} from '@vue/test-utils'
import MyPage from './MyPage.vue'
import {accessToken, user} from '../composables/useAuth'

vi.mock('vue-sonner', () => ({
    toast: {success: vi.fn(), error: vi.fn()},
}))

vi.mock('vue-router', () => ({
    useRouter: () => ({replace: vi.fn(), push: vi.fn()}),
}))

vi.mock('../api/client', () => ({
    apiClient: {get: vi.fn(), delete: vi.fn()},
}))

const mockUser = {
    id: 1,
    provider: 'GOOGLE' as const,
    nickname: '테스터',
    email: 'tester@example.com',
    createdAt: '2026-01-01T00:00:00Z',
    status: 'ACTIVE' as const,
}

function mountMyPage() {
    return mount(MyPage, {
        global: {
            // 작업 이력 섹션은 이 이슈(아이콘 버튼 aria-label)와 무관하고 자체적으로 API를 호출하므로 스텁으로 대체한다.
            stubs: {JobHistorySection: true},
        },
    })
}

beforeEach(() => {
    vi.clearAllMocks()
    accessToken.value = 'token'
    user.value = {...mockUser}
})

describe('MyPage 정지 상태 배너', () => {
    it('status가 ACTIVE인 유저에게는 정지 배너가 보이지 않는다', () => {
        user.value = {...mockUser, status: 'ACTIVE'}
        const wrapper = mountMyPage()

        expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    })

    it('status가 SUSPENDED인 유저에게는 정지 배너가 항상 보인다', () => {
        user.value = {...mockUser, status: 'SUSPENDED'}
        const wrapper = mountMyPage()

        const banner = wrapper.find('[role="alert"]')
        expect(banner.exists()).toBe(true)
        expect(banner.text()).toContain('댓글')
    })

    it('정지 배너 문구는 댓글 작성만 제한됨을 명시하고 전체 계정이 막힌 것처럼 오해하게 하지 않는다', () => {
        user.value = {...mockUser, status: 'SUSPENDED'}
        const wrapper = mountMyPage()

        const bannerText = wrapper.find('[role="alert"]').text()
        expect(bannerText).toContain('댓글')
        expect(bannerText).toContain('로그인')
        expect(bannerText).not.toContain('계정이 정지')
        expect(bannerText).not.toContain('이용할 수 없습니다')
    })
})

describe('MyPage 닉네임 편집 아이콘 버튼 접근성', () => {
    it('편집 버튼(연필 아이콘)에 aria-label="닉네임 수정"이 있다', () => {
        const wrapper = mountMyPage()

        const editBtn = wrapper.find('button[aria-label="닉네임 수정"]')
        expect(editBtn.exists()).toBe(true)
    })

    it('편집 모드로 전환하면 저장/취소 아이콘 버튼에 각각 aria-label이 있다', async () => {
        const wrapper = mountMyPage()

        const editBtn = wrapper.find('button[aria-label="닉네임 수정"]')
        await editBtn.trigger('click')

        const saveBtn = wrapper.find('button[aria-label="저장"]')
        const cancelBtn = wrapper.find('button[aria-label="취소"]')
        expect(saveBtn.exists()).toBe(true)
        expect(cancelBtn.exists()).toBe(true)
    })
})
